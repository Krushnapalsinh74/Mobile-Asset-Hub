import { useApp } from '@/context/AppContext';
import { eduApi, getId, normalizeYunoraQuestion } from '@/services/api';
import type { Chapter, Question, Subject, Topic } from '@/services/api';
import { LANGUAGES } from '@/services/translate';
import { loadQuestions, saveQuestions } from '@/store/questionStore';
import { KNOWLEDGE_PARK_LOGO_DATA_URL } from '@/constants/branding';
import { Ionicons } from '@expo/vector-icons';
import { useQueries, useQuery } from '@tanstack/react-query';
import katex from 'katex';
import * as Print from 'expo-print';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import MathText from '@/components/MathText';
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type BuildMode = 'chapter' | 'difficulty' | 'random' | 'custom';
type Difficulty = 'easy' | 'medium' | 'hard' | 'advanced';
type AnswerKeyMode = 'none' | 'key_end' | 'solutions_end' | 'inline';

type PaperQuestion = Question & {
  _key: string;
  _subjectId: string;
  _subjectName: string;
  _chapterKey: string;
  _chapterName: string;
  _topicId?: string;
  _topicName?: string;
  _editedText?: string;
  _editedOptions?: string[];
  _editedAnswer?: string;
  _editedExplanation?: string;
  _imageDataUrl?: string;
  _manualMarks?: number;
  _subsectionName?: string;
};
type PaperSection = { id: string; title: string; subsections: string[]; questionKeys: string[]; questions: PaperQuestion[]; orderKeys: string[] };
type PaperChapter = Chapter & { _key: string; _subjectId: string; _subjectName: string };
type PaperTopic = Topic & { _key: string; _chapterKey: string; _chapterName: string; _subjectName: string };
const LATEX_PATTERN = /(\$\$[\s\S]*?\$\$|\\\[[\s\S]*?\\\]|\$(?!\$)(?:[^$\n\\]|\\.)*?\$|\\\(.+?\\\))/g;

const MODES: { value: BuildMode; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: 'chapter', label: 'By chapter', icon: 'library-outline' },
  { value: 'difficulty', label: 'By difficulty', icon: 'speedometer-outline' },
  { value: 'random', label: 'Random paper', icon: 'shuffle-outline' },
  { value: 'custom', label: 'Custom paper', icon: 'options-outline' },
];
const DIFFICULTIES: { value: Difficulty; label: string; color: string }[] = [
  { value: 'easy', label: 'Easy', color: '#4F936C' },
  { value: 'medium', label: 'Medium', color: '#D28A25' },
  { value: 'hard', label: 'Hard', color: '#C85C3E' },
  { value: 'advanced', label: 'Advanced', color: '#7653A4' },
];

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[char]!);
}

function renderTextHtml(text: string): string {
  let html = '';
  let lastIndex = 0;
  for (const match of text.matchAll(LATEX_PATTERN)) {
    const raw = match[0];
    const start = match.index ?? 0;
    html += escapeHtml(text.slice(lastIndex, start));
    const displayMode = raw.startsWith('$$') || raw.startsWith('\\[');
    const expression = raw.startsWith('$$')
      ? raw.slice(2, -2)
      : raw.startsWith('\\[') || raw.startsWith('\\(')
        ? raw.slice(2, -2)
        : raw.slice(1, -1);
    html += katex.renderToString(expression.trim(), {
      displayMode,
      throwOnError: false,
      output: 'html',
      strict: false,
    });
    lastIndex = start + raw.length;
  }
  return html + escapeHtml(text.slice(lastIndex));
}

function cleanOptionText(option: string): string {
  if (!option) return '';
  return option.replace(/^(?:\(?[A-Ea-e]\)?[.:\-]\s*|\(?[A-Ea-e]\)\s*)/, '').trim();
}

function getQuestionPrompt(q: PaperQuestion): string {
  return q._editedText ?? q.question;
}

function getQuestionOptions(q: PaperQuestion): string[] {
  return q._editedOptions ?? q.options ?? [];
}

function getQuestionAnswer(q: PaperQuestion): string {
  return q._editedAnswer ?? q.answer ?? '';
}

function getQuestionExplanation(q: PaperQuestion): string {
  const custom = q._editedExplanation ?? q.explanation ?? q.solution ?? '';
  if (custom.trim()) return custom.trim();
  const ans = formatAnswer(q);
  if (ans.trim()) return `The correct choice is ${ans}.`;
  return '';
}

function formatAnswer(question: PaperQuestion): string {
  const answer = getQuestionAnswer(question).trim();
  const options = getQuestionOptions(question);
  const letter = answer.match(/^([A-E])(?:[).:]|$)/i)?.[1]?.toUpperCase();
  if (letter && options.length) {
    const index = letter.charCodeAt(0) - 'A'.charCodeAt(0);
    if (options[index]) return `${letter}. ${cleanOptionText(options[index])}`;
  }
  return cleanOptionText(answer);
}

function extractLetterOrAnswer(question: PaperQuestion): string {
  const answer = getQuestionAnswer(question).trim();
  const options = getQuestionOptions(question);
  const letter = answer.match(/^([A-E])(?:[).:]|$)/i)?.[1]?.toUpperCase();
  if (letter) return `(${letter})`;
  if (options.length) {
    const matchIdx = options.findIndex((o) => cleanOptionText(o).toLowerCase() === cleanOptionText(answer).toLowerCase());
    if (matchIdx >= 0) return `(${String.fromCharCode(65 + matchIdx)})`;
  }
  return answer || '—';
}

function formatDiagram(question: Question): string {
  if (question.textDiagram) return `<pre class="diagram">${escapeHtml(question.textDiagram)}</pre>`;
  const diagramUrl = typeof question.diagram === 'string'
    ? question.diagram
    : question.diagram?.url;
  if (typeof diagramUrl === 'string' && /^(https:\/\/|data:image\/)/i.test(diagramUrl)) {
    return `<img class="diagramImage" src="${escapeHtml(diagramUrl)}" alt="Question diagram">`;
  }
  return '';
}

function getQuestionSourceLabel(question: PaperQuestion): string {
  return question._key.startsWith('generated:') || question._key.startsWith('direct_')
    ? '✨ AI Generated'
    : '🏛️ Question Bank';
}

function printHtmlOnWeb(html: string) {
  if (typeof window === 'undefined') return;

  // Dedicated blank popup: prints ONLY the paper and never the UI form or navigation
  const printWindow = window.open('', '_blank', 'width=950,height=900');
  if (printWindow) {
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      try {
        printWindow.print();
      } catch (e) {
        console.warn('Popup print trigger warning:', e);
      }
    }, 600);
    return;
  }

  // Fallback: print via hidden iframe if popup was blocked
  const oldFrame = document.getElementById('__question_paper_print_frame__');
  if (oldFrame && oldFrame.parentNode) {
    oldFrame.parentNode.removeChild(oldFrame);
  }

  const iframe = document.createElement('iframe');
  iframe.id = '__question_paper_print_frame__';
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '210mm';
  iframe.style.height = '297mm';
  iframe.style.border = 'none';
  iframe.style.opacity = '0.01';
  iframe.style.pointerEvents = 'none';
  iframe.style.zIndex = '-99999';

  document.body.appendChild(iframe);

  const frameDoc = iframe.contentWindow?.document;
  if (frameDoc) {
    frameDoc.open();
    frameDoc.write(html);
    frameDoc.close();
    let hasTriggered = false;
    const triggerPrint = () => {
      if (hasTriggered) return;
      hasTriggered = true;
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch (e) {
        console.warn('Iframe print error:', e);
      } finally {
        setTimeout(() => {
          if (document.body.contains(iframe)) {
            document.body.removeChild(iframe);
          }
        }, 60000);
      }
    };
    if (iframe.contentWindow) {
      iframe.contentWindow.onload = () => setTimeout(triggerPrint, 350);
    }
    setTimeout(triggerPrint, 700);
  }
}

function makeQuestionSheetHtml({
  subject,
  title,
  instructions,
  institution,
  institutionLogo,
  showStudentFields,
  examName,
  grade,
  duration,
  watermark,
  footer,
  pageSize,
  showPageNumbers,
  questions,
  sections,
  marks,
  answerKeyMode,
}: {
  subject: string;
  title: string;
  instructions: string;
  institution: string;
  institutionLogo: string;
  showStudentFields: boolean;
  examName: string;
  grade: string;
  duration: string;
  watermark: string;
  footer: string;
  pageSize: 'A4' | 'Letter';
  showPageNumbers: boolean;
  questions: PaperQuestion[];
  sections?: PaperSection[];
  marks: (question: PaperQuestion) => number;
  answerKeyMode: AnswerKeyMode;
}): string {
  const renderQuestion = (question: PaperQuestion, index: number) => {
    const opts = getQuestionOptions(question);
    const options = opts.length
      ? `<ol class="options" type="A">${opts.map((option) => `<li>${renderTextHtml(cleanOptionText(option))}</li>`).join('')}</ol>`
      : '';
    const resolvedAnswer = formatAnswer(question);
    const answer = answerKeyMode === 'inline' && resolvedAnswer
      ? `<div class="answer"><b>Correct Answer:</b> ${renderTextHtml(resolvedAnswer)}</div>`
      : '';
    const explanationText = getQuestionExplanation(question);
    const explanation = answerKeyMode === 'inline' && explanationText
      ? `<div class="explanation"><b>Explanation:</b> ${renderTextHtml(explanationText)}</div>`
      : '';
    const manualImage = question._imageDataUrl
      ? `<img class="diagramImage" src="${escapeHtml(question._imageDataUrl)}" alt="Question supplied by teacher">`
      : '';
    const answerSpace = answerKeyMode !== 'inline' ? '<div class="answer-space"></div>' : '';
    return `<section class="question"><div class="prompt"><span class="number">${index + 1}.</span><span class="questionText">${renderTextHtml(getQuestionPrompt(question))}</span><span class="marks">[${marks(question)} mark${marks(question) === 1 ? '' : 's'}]</span></div>${manualImage}${formatDiagram(question)}${options}${answerSpace}${answer}${explanation}</section>`;
  };

  let questionNumber = 0;
  const questionBlocks = sections?.length
    ? sections.map((section) => {
      const sectionQuestions = section.questions;
      const sectionBody = section.subsections.map((subsection) => {
        const subsectionQuestions = sectionQuestions
          .filter((question) => question._subsectionName === subsection);
        return subsectionQuestions.length
          ? `<h3 class="subsection">${escapeHtml(subsection)}</h3>${subsectionQuestions.map((question) => renderQuestion(question, ++questionNumber)).join('')}`
          : '';
      }).join('') + sectionQuestions
        .filter((question) => !question._subsectionName)
        .map((question) => renderQuestion(question, ++questionNumber))
        .join('');
      return `<section class="paperSection"><h2>${escapeHtml(section.title)}</h2>${sectionBody}</section>`;
    }).join('')
    : questions.map((question) => renderQuestion(question, ++questionNumber)).join('');

  const allQuestionsList: PaperQuestion[] = sections?.length
    ? sections.flatMap((s) => s.questions)
    : questions;

  let endSectionHtml = '';
  if (answerKeyMode === 'key_end') {
    endSectionHtml = `
      <div class="pageBreak"></div>
      <section class="separateEndPage answerKeySection">
        <div class="endPageBanner">
          ${institutionLogo ? `<img class="logo" src="${escapeHtml(institutionLogo)}" alt="Institution logo">` : ''}
          ${institution.trim() ? `<div class="endPageInstitution">${escapeHtml(institution.trim())}</div>` : ''}
          <h2 class="endSectionTitle">${escapeHtml(title)} — Official Answer Key</h2>
          <p class="endSectionSub">${escapeHtml(subject)} · Separate Evaluation Key Sheet (${allQuestionsList.length} Questions)</p>
        </div>
        <div class="answerKeyGrid">
          ${allQuestionsList.map((q, idx) => `
            <div class="keyCell">
              <span class="keyNum">Q${idx + 1}</span>
              <span class="keyVal">${escapeHtml(extractLetterOrAnswer(q))}</span>
            </div>
          `).join('')}
        </div>
      </section>
    `;
  } else if (answerKeyMode === 'solutions_end') {
    endSectionHtml = `
      <div class="pageBreak"></div>
      <section class="separateEndPage solutionsSection">
        <div class="endPageBanner">
          ${institutionLogo ? `<img class="logo" src="${escapeHtml(institutionLogo)}" alt="Institution logo">` : ''}
          ${institution.trim() ? `<div class="endPageInstitution">${escapeHtml(institution.trim())}</div>` : ''}
          <h2 class="endSectionTitle">${escapeHtml(title)} — Detailed Explanations & Solutions</h2>
          <p class="endSectionSub">${escapeHtml(subject)} · Separate Solutions Guide Sheet (${allQuestionsList.length} Questions)</p>
        </div>
        ${allQuestionsList.map((q, idx) => {
          const ans = formatAnswer(q);
          const expl = getQuestionExplanation(q);
          return `
            <article class="solutionCard">
              <div class="solutionHead">
                <span class="solQNum">Question ${idx + 1}</span>
                ${ans ? `<span class="solBadge">Correct Answer: ${renderTextHtml(ans)}</span>` : ''}
              </div>
              ${expl ? `<div class="solBody">${renderTextHtml(expl)}</div>` : '<div class="solBody emptySol">No additional explanation provided.</div>'}
            </article>
          `;
        }).join('')}
      </section>
    `;
  }

  const pageMargins = '18mm';
  const watermarkMarkup = watermark.trim()
    ? `<div class="watermark">${escapeHtml(watermark.trim())}</div>`
    : '';
  const headerMeta = [
    grade.trim(),
    examName.trim(),
    duration.trim() ? `${duration.trim()} minutes` : '',
  ].filter(Boolean).join(' · ');
  const pageCounter = showPageNumbers ? '<div class="pageNumber"></div>' : '';
  const studentFields = showStudentFields
    ? '<span>Name: ____________________ &nbsp; Date: __________</span>'
    : '';

  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)}</title><link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.22/dist/katex.min.css"><style>
    @page{size:${pageSize};margin:${pageMargins}}*{box-sizing:border-box}body{font-family:Arial,sans-serif;color:#2f2925;font-size:11pt;line-height:1.55;padding-bottom:12mm}header{position:relative;text-align:center;border-bottom:2px solid #c85c3e;padding-bottom:12px;margin-bottom:22px}h1{font-size:20pt;margin:4px 0}header p{margin:0;color:#76645b}.institution{font-size:13pt;font-weight:700}.logo{max-width:84px;max-height:52px;object-fit:contain;margin:0 auto 6px}.meta{display:flex;justify-content:space-between;gap:12px;margin-top:16px;font-size:9pt}.headerMeta{margin-top:8px;color:#76645b;font-size:9pt}.instructions{margin-top:14px;text-align:left;color:#51443d;font-size:10pt}.paperSection{break-before:auto}.paperSection h2{margin:22px 0 13px;padding:8px 10px;border-left:4px solid #c85c3e;background:#f8f2ec;font-size:14pt;break-after:avoid}.subsection{margin:14px 0 9px;color:#7653a4;font-size:11pt;break-after:avoid}.question{break-inside:avoid;margin:0 0 20px}.prompt{display:flex;gap:8px;font-weight:600}.number{color:#c85c3e;font-weight:700;white-space:nowrap}.marks{margin-left:auto;color:#76645b;font-size:9pt;white-space:nowrap}.options{margin:9px 0 0 28px;padding-left:20px}.options li{padding:2px 0 2px 6px}.answer-space{height:22px;border-bottom:1px dotted #d8cec5;margin-top:9px}.answer,.explanation{margin:9px 0 0 28px;padding:8px 10px;border-radius:5px;background:#f8f2ec}.explanation{background:#f1f5ef}.diagram{font-family:monospace;white-space:pre-wrap;margin:10px 28px}.diagramImage{display:block;max-width:100%;max-height:260px;object-fit:contain;margin:10px 28px}.watermark{position:fixed;left:12%;right:12%;top:40%;z-index:-1;text-align:center;transform:rotate(-32deg);font-size:52pt;font-weight:800;letter-spacing:5px;color:#c85c3e;opacity:.09;pointer-events:none}.footer{position:fixed;bottom:-10mm;left:0;right:0;padding-top:5px;border-top:1px solid #e7ded4;color:#8b786d;font-size:8pt;text-align:center}.pageNumber{position:fixed;bottom:-10mm;right:0;color:#8b786d;font-size:8pt}.pageNumber:after{content:counter(page)}
    .pageBreak{page-break-before:always !important;break-before:page !important;display:block;height:0;clear:both}
    .separateEndPage{page-break-before:always !important;break-before:page !important;clear:both}
    @media screen{.pageBreak{height:30px;border-bottom:2px dashed #C85C3E;margin:40px 0 24px;position:relative}.pageBreak:after{content:"SEPARATE PAGE BREAK";position:absolute;top:-10px;left:50%;transform:translateX(-50%);background:#FFF;padding:0 12px;font-size:9pt;font-weight:800;color:#C85C3E;border:1px solid #C85C3E;border-radius:4px}.separateEndPage{margin-top:10px}}
    .endPageBanner{text-align:center;margin-bottom:22px;padding-bottom:12px;border-bottom:2px solid #c85c3e}
    .endPageInstitution{font-size:11pt;font-weight:700;color:#76645b;text-transform:uppercase;margin-bottom:4px}
    .endSectionTitle{font-size:16pt;font-weight:800;color:#1f1b18;margin:0 0 4px}
    .endSectionSub{font-size:9.5pt;color:#76645b;margin:0}
    .answerKeyGrid{display:grid;grid-template-columns:repeat(5,1fr);gap:10px;margin-top:16px}
    .keyCell{display:flex;align-items:center;justify-content:space-between;background:#f8f2ec;border:1.5px solid #e7ded4;border-radius:6px;padding:8px 12px;font-size:10.5pt;font-weight:700}
    .keyNum{color:#76645b;font-size:9.5pt}
    .keyVal{color:#c85c3e;font-weight:800}
    .solutionCard{background:#faf6f2;border:1px solid #ebdcd0;border-radius:8px;padding:12px 16px;margin-bottom:14px;break-inside:avoid}
    .solutionHead{display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;font-size:10pt}
    .solQNum{font-weight:800;color:#7653a4}
    .solBadge{font-weight:700;background:#ede4f7;color:#5b328a;padding:3px 10px;border-radius:5px;font-size:9pt}
    .solBody{font-size:10pt;line-height:1.55;color:#3d342f}
    .emptySol{color:#9c8a81;font-style:italic}
  </style></head><body>${watermarkMarkup}<header>${institutionLogo ? `<img class="logo" src="${escapeHtml(institutionLogo)}" alt="Institution logo">` : ''}${institution.trim() ? `<div class="institution">${escapeHtml(institution.trim())}</div>` : ''}<h1>${escapeHtml(title)}</h1><p>${escapeHtml(subject)}</p>${headerMeta ? `<div class="headerMeta">${escapeHtml(headerMeta)}</div>` : ''}<div class="meta"><span>${questions.length} questions · ${questions.reduce((sum, question) => sum + marks(question), 0)} total marks</span>${studentFields}</div>${instructions ? `<div class="instructions">${escapeHtml(instructions)}</div>` : ''}</header>${questionBlocks}${endSectionHtml}${footer.trim() ? `<footer class="footer">${escapeHtml(footer.trim())}</footer>` : ''}${pageCounter}</body></html>`;
}

export default function QuestionsPdfScreen() {
  const {
    sessionId = '',
    subjectId = '',
    subjectName = 'Subject',
    chapterId = '',
    chapterName = '',
    questionCount: paramCount = '',
    language: paramLang = '',
    solutions: paramSolutions = '',
    difficulty: paramDifficulty = '',
  } = useLocalSearchParams<{
    sessionId?: string;
    subjectId?: string;
    subjectName?: string;
    chapterId?: string;
    chapterName?: string;
    questionCount?: string;
    language?: string;
    solutions?: string;
    difficulty?: string;
  }>();
  const { boardId, standardId, boardName, standardName } = useApp();
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const isWideScreen = windowWidth >= 1000;
  const [mode, setMode] = useState<BuildMode>('chapter');
  const [selectedLanguage, setSelectedLanguage] = useState<string>(paramLang || 'en');
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<string[]>([]);
  const [selectedChapterKeys, setSelectedChapterKeys] = useState<string[]>([]);
  const [selectedTopicIdsByChapter, setSelectedTopicIdsByChapter] = useState<Record<string, string[]>>({});
  const [selectedDifficulties, setSelectedDifficulties] = useState<Difficulty[]>(
    paramDifficulty && paramDifficulty !== 'mixed' && ['easy', 'medium', 'hard', 'advanced'].includes(paramDifficulty)
      ? [paramDifficulty as Difficulty]
      : ['easy', 'medium', 'hard', 'advanced']
  );
  const [questionCount, setQuestionCount] = useState(paramCount || '20');
  const [defaultMark, setDefaultMark] = useState('1');
  const [customKeys, setCustomKeys] = useState<string[]>([]);
  const [markByKey, setMarkByKey] = useState<Record<string, string>>({});
  const [editedQuestionByKey, setEditedQuestionByKey] = useState<Record<string, string>>({});
  const [paperTitle, setPaperTitle] = useState(`${subjectName} Practice Paper`);
  const [paperSubject, setPaperSubject] = useState(subjectName);
  const [instructions, setInstructions] = useState('Answer all questions. Show your working where needed.');
  const [institution, setInstitution] = useState('Knowledge Park');
  const [examName, setExamName] = useState('');
  const [grade, setGrade] = useState(standardName ?? '');
  const [duration, setDuration] = useState('');
  const [watermark, setWatermark] = useState('');
  const [footer, setFooter] = useState('');
  const [pageSize, setPageSize] = useState<'A4' | 'Letter'>('A4');
  const [showPageNumbers, setShowPageNumbers] = useState(true);
  const [showStudentFields, setShowStudentFields] = useState(true);
  const [institutionLogo, setInstitutionLogo] = useState(KNOWLEDGE_PARK_LOGO_DATA_URL);
  const [answerKeyMode, setAnswerKeyMode] = useState<AnswerKeyMode>(
    paramSolutions === 'true' || paramSolutions === 'solutions_end'
      ? 'solutions_end'
      : paramSolutions === 'key_end'
      ? 'key_end'
      : 'none'
  );
  const [editedOptionsByKey, setEditedOptionsByKey] = useState<Record<string, string[]>>({});
  const [editedAnswerByKey, setEditedAnswerByKey] = useState<Record<string, string>>({});
  const [editedExplanationByKey, setEditedExplanationByKey] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState<'setup' | 'preview'>('setup');
  const [questionSource, setQuestionSource] = useState<'generated' | 'bank' | 'all'>(
    sessionId ? 'generated' : 'bank'
  );
  const [shuffleSeed, setShuffleSeed] = useState(0);

  function balanceQuestionsIfBiased<T extends Question>(questions: T[]): T[] {
    if (!questions || questions.length < 2) return questions;
    const countA = questions.filter((q) => {
      const m = (q.answer || '').match(/^[(\[]?([A-Ea-e])[)\]]?/);
      return m && m[1].toUpperCase() === 'A';
    }).length;
    if (countA / questions.length < 0.6) return questions;
    const targetCycle = [0, 1, 2, 3, 1, 2, 0, 3, 2, 1, 3, 0];
    return questions.map((q, idx) => {
      if (!q.options || q.options.length < 2) return q;
      const cleanOptions = q.options.map((opt) => opt.replace(/^[A-Ea-e][\.\)]\s*/, '').trim());
      let origIdx = -1;
      const ansMatch = (q.answer || '').match(/^[(\[]?([A-Ea-e])[)\]]?/);
      if (ansMatch) origIdx = ansMatch[1].toUpperCase().charCodeAt(0) - 65;
      if (origIdx < 0 || origIdx >= cleanOptions.length) {
        origIdx = cleanOptions.findIndex((opt) => (q.answer || '').toLowerCase().includes(opt.toLowerCase()));
      }
      if (origIdx < 0 || origIdx >= cleanOptions.length) origIdx = 0;
      const correctText = cleanOptions[origIdx];
      const target = Math.min(targetCycle[idx % targetCycle.length], cleanOptions.length - 1);
      const shuffled = [...cleanOptions];
      shuffled.splice(origIdx, 1);
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const tmp = shuffled[i]!;
        shuffled[i] = shuffled[j]!;
        shuffled[j] = tmp;
      }
      shuffled.splice(target, 0, correctText);
      const origLetter = String.fromCharCode(65 + origIdx);
      const newLetter = String.fromCharCode(65 + target);
      let expl = q.explanation || q.solution || '';
      if (expl && origLetter !== newLetter) {
        expl = expl
          .replace(new RegExp(`\\bOption\\s+${origLetter}\\b`, 'gi'), `Option ${newLetter}`)
          .replace(new RegExp(`\\(${origLetter}\\)`, 'g'), `(${newLetter})`)
          .replace(new RegExp(`\\b(?:answer|choice)\\s+(?:is\\s+)?${origLetter}\\b`, 'gi'), `answer is ${newLetter}`);
      }
      const finalExpl = expl || (correctText ? `The correct choice is (${newLetter}) ${correctText}.` : '');
      return {
        ...q,
        options: shuffled,
        answer: `(${newLetter}) ${correctText}`,
        explanation: finalExpl,
        solution: finalExpl,
      };
    });
  }

  const [generatedPool, setGeneratedPool] = useState<PaperQuestion[]>(() => {
    if (sessionId) {
      const stored = balanceQuestionsIfBiased(loadQuestions(sessionId) || []);
      if (stored && stored.length > 0) {
        return stored.map((q, idx) => ({
          ...q,
          _key: `direct_${idx}_${sessionId}`,
          _subjectId: subjectId || 'sub_general',
          _subjectName: subjectName || 'Subject',
          _chapterKey: chapterId || 'ch_general',
          _chapterName: chapterName || 'Practice Paper',
        }));
      }
    }
    return [];
  });

  useEffect(() => {
    if (sessionId) {
      const stored = balanceQuestionsIfBiased(loadQuestions(sessionId) || []);
      if (stored && stored.length > 0) {
        setGeneratedPool(
          stored.map((q, idx) => ({
            ...q,
            _key: `direct_${idx}_${sessionId}`,
            _subjectId: subjectId || 'sub_general',
            _subjectName: subjectName || 'Subject',
            _chapterKey: chapterId || 'ch_general',
            _chapterName: chapterName || 'Practice Paper',
          }))
        );
        setQuestionSource('generated');
      }
    }
  }, [sessionId, subjectId, subjectName, chapterId, chapterName]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState('');
  const [sections, setSections] = useState<PaperSection[]>([
    { id: 'section-1', title: 'Section A', subsections: ['Part 1'], questionKeys: [], questions: [], orderKeys: [] },
  ]);
  const [activeSubsectionByQuestion, setActiveSubsectionByQuestion] = useState<Record<string, string>>({});
  const [activeSectionId, setActiveSectionId] = useState('section-1');
  const [activeSubsection, setActiveSubsection] = useState('Part 1');
  const [manualQuestionText, setManualQuestionText] = useState('');
  const [manualQuestionMarks, setManualQuestionMarks] = useState('1');
  const [manualQuestionImage, setManualQuestionImage] = useState('');
  const [editingQuestionKey, setEditingQuestionKey] = useState<string | null>(null);
  const initializedSubjects = useRef(false);
  const initializedChapterSubjects = useRef(new Set<string>());
  const subjectsQuery = useQuery({
    queryKey: ['subjects', boardId, standardId],
    queryFn: () => eduApi.getSubjects(boardId!, standardId!),
    enabled: !!boardId && !!standardId,
    initialData: () => eduApi.getCachedSubjects(boardId, standardId),
    staleTime: 1000 * 60 * 30,
  });
  const availableSubjects = subjectsQuery.data ?? [];

  useEffect(() => {
    if (initializedSubjects.current || !subjectsQuery.data) return;
    initializedSubjects.current = true;
    const requestedIds = subjectId.split(',').filter(Boolean);
    const initialIds = requestedIds.filter((id) => subjectsQuery.data!.some((subject) => getId(subject) === id));
    const matchedByName = !initialIds.length && subjectName
      ? subjectsQuery.data.filter((s) => s.name.toLowerCase() === subjectName.toLowerCase()).map(getId)
      : [];
    const selectedIds = initialIds.length
      ? initialIds
      : matchedByName.length
      ? matchedByName
      : subjectsQuery.data.slice(0, 1).map(getId);
    setSelectedSubjectIds(selectedIds);
    const selectedNames = subjectsQuery.data
      .filter((subject) => selectedIds.includes(getId(subject)))
      .map((subject) => subject.name);
    if (selectedNames.length) setPaperSubject(selectedNames.join(', '));
  }, [subjectId, subjectName, subjectsQuery.data]);

  const selectedSubjects = useMemo(
    () => availableSubjects.filter((subject) => selectedSubjectIds.includes(getId(subject))),
    [availableSubjects, selectedSubjectIds],
  );
  const chapterQueries = useQueries({
    queries: selectedSubjects.map((subject) => ({
      queryKey: ['chapters', boardId, standardId, getId(subject)],
      queryFn: () => eduApi.getChapters(boardId!, standardId!, getId(subject)),
      enabled: !!boardId && !!standardId && !!getId(subject),
    })),
  });
  const availableChapters: PaperChapter[] = selectedSubjects.flatMap((subject, index) =>
    (chapterQueries[index]?.data ?? []).map((chapter) => ({
      ...chapter,
      _key: `${getId(subject)}::${getId(chapter)}`,
      _subjectId: getId(subject),
      _subjectName: subject.name,
    })),
  );

  useEffect(() => {
    const targetChapterKeys: string[] = [];
    selectedSubjects.forEach((subject, index) => {
      const sId = getId(subject);
      const query = chapterQueries[index];
      if (!query || query.isLoading || query.isError || initializedChapterSubjects.current.has(sId)) return;
      initializedChapterSubjects.current.add(sId);
      const matchedChapter = query.data?.find((ch) =>
        (chapterId && getId(ch) === chapterId) ||
        (chapterName && ch.name.toLowerCase().includes(chapterName.toLowerCase()))
      );
      const targetChapter = matchedChapter ?? query.data?.[0];
      if (targetChapter) targetChapterKeys.push(`${sId}::${getId(targetChapter)}`);
    });
    if (targetChapterKeys.length) setSelectedChapterKeys((current) => [...new Set([...current, ...targetChapterKeys])]);
  }, [selectedSubjects, chapterQueries, chapterId, chapterName]);

  const selectedChapters = useMemo(
    () => availableChapters.filter((chapter) => selectedChapterKeys.includes(chapter._key)),
    [availableChapters, selectedChapterKeys],
  );
  const topicQueries = useQueries({
    queries: selectedChapters.map((chapter) => ({
      queryKey: ['topics', boardId, standardId, chapter._subjectId, getId(chapter)],
      queryFn: () => eduApi.getTopics(boardId!, standardId!, chapter._subjectId, getId(chapter)),
      enabled: !!boardId && !!standardId,
    })),
  });
  const topicsByChapter: PaperTopic[][] = selectedChapters.map((chapter, index) =>
    (topicQueries[index]?.data ?? []).map((topic) => ({
      ...topic,
      _key: `${chapter._key}::${getId(topic)}`,
      _chapterKey: chapter._key,
      _chapterName: chapter.name,
      _subjectName: chapter._subjectName,
    })),
  );
  const questionSources: { chapter: PaperChapter; topicId?: string }[] = useMemo(() => {
    const list: { chapter: PaperChapter; topicId?: string }[] = [];
    selectedChapters.forEach((chapter) => {
      const selectedTopicIds = selectedTopicIdsByChapter[chapter._key] ?? [];
      if (selectedTopicIds.length) {
        selectedTopicIds.forEach((topicId) => list.push({ chapter, topicId }));
      } else {
        list.push({ chapter, topicId: undefined });
      }
    });
    return list;
  }, [selectedChapters, selectedTopicIdsByChapter]);
  const questionQueries = useQueries({
    queries: questionSources.map(({ chapter, topicId }) => ({
      queryKey: ['bank-questions', chapter._subjectId, getId(chapter), topicId ?? 'all', selectedLanguage],
      queryFn: () => eduApi.getBankQuestions({ chapterId: getId(chapter), topicId, lang: selectedLanguage }),
      enabled: !!getId(chapter),
    })),
  });

  // Derive which languages are actually available in the loaded question pool
  // We probe by checking if any chapter returned results for a given lang.
  // For a great UX, always include English + detect if Gujarati/Hindi pool is non-empty.
  const languageProbeQueries = useQueries({
    queries: selectedChapters.slice(0, 1).flatMap((chapter) =>
      LANGUAGES.filter((l) => l.code !== 'en').map((lang) => ({
        queryKey: ['lang-probe', getId(chapter), lang.code],
        queryFn: async () => {
          const items = await eduApi.getBankQuestions({ chapterId: getId(chapter), lang: lang.code });
          return { langCode: lang.code, count: items.length };
        },
        enabled: !!getId(chapter),
        staleTime: 5 * 60 * 1000,
      }))
    ),
  });

  const availableLanguages = useMemo(() => {
    const available: string[] = ['en'];
    for (const q of languageProbeQueries) {
      if (q.data && q.data.count > 0) {
        available.push(q.data.langCode);
      }
    }
    return LANGUAGES.filter((l) => available.includes(l.code));
  }, [languageProbeQueries]);
  const isLoadingQuestions = questionQueries.some((query) => query.isLoading);
  const hasQuestionError = questionQueries.some((query) => query.isError);
  const isLoadingChapters = chapterQueries.some((query) => query.isLoading);
  const hasChapterError = chapterQueries.some((query) => query.isError);

  const bankQuestionsList: PaperQuestion[] = useMemo(() => {
    const list: PaperQuestion[] = [];
    const seen = new Set<string>();
    questionSources.forEach(({ chapter, topicId }, sourceIndex) => {
      const topic = topicsByChapter.find((items) => items[0]?._chapterKey === chapter._key)
        ?.find((item) => getId(item) === topicId);
      ((questionQueries[sourceIndex]?.data as Question[] | undefined) ?? []).forEach((question, index) => {
        const textKey = question.question.trim().toLowerCase();
        if (!textKey || seen.has(textKey)) return;
        seen.add(textKey);
        list.push({
          ...question,
          _key: `${chapter._key}::${topicId ?? 'all'}::${question.id ?? index}:${index}`,
          _subjectId: chapter._subjectId,
          _subjectName: chapter._subjectName,
          _chapterKey: chapter._key,
          _chapterName: chapter.name,
          _topicId: topicId,
          _topicName: topic?.name ?? question.topicName,
        });
      });
    });
    return list;
  }, [questionSources, questionQueries, topicsByChapter]);

  const activeGeneratedPool: PaperQuestion[] = useMemo(() => {
    return generatedPool.filter((question) => {
      if (question._key.startsWith('direct_')) return true;
      return (
        selectedChapterKeys.includes(question._chapterKey) &&
        (!selectedTopicIdsByChapter[question._chapterKey]?.length ||
          selectedTopicIdsByChapter[question._chapterKey]!.includes(question._topicId ?? ''))
      );
    });
  }, [generatedPool, selectedChapterKeys, selectedTopicIdsByChapter]);

  const allQuestions: PaperQuestion[] = useMemo(() => {
    if (questionSource === 'generated') {
      if (activeGeneratedPool.length > 0) return activeGeneratedPool;
      return bankQuestionsList;
    }
    if (questionSource === 'bank') {
      return bankQuestionsList;
    }
    // 'all': prioritize AI Generated questions FIRST, then add unique Question Bank questions
    const seen = new Set<string>();
    const combined: PaperQuestion[] = [];
    for (const q of activeGeneratedPool) {
      const k = q.question.trim().toLowerCase();
      if (k && !seen.has(k)) {
        seen.add(k);
        combined.push(q);
      }
    }
    for (const q of bankQuestionsList) {
      const k = q.question.trim().toLowerCase();
      if (k && !seen.has(k)) {
        seen.add(k);
        combined.push(q);
      }
    }
    return combined;
  }, [questionSource, activeGeneratedPool, bankQuestionsList]);

  const customSections = useMemo(() => sections.map((section) => {
    const bankQuestions = section.questionKeys.flatMap((key) => {
      const question = allQuestions.find((candidate) => candidate._key === key);
      return question
        ? [{ ...question, _subsectionName: activeSubsectionByQuestion[key] ?? '' }]
        : [];
    });
    const allSectionQuestions = [...bankQuestions, ...section.questions];
    const questionByKey = new Map(allSectionQuestions.map((question) => [question._key, question]));
    const ordered = section.orderKeys.flatMap((key) => {
      const question = questionByKey.get(key);
      return question ? [question] : [];
    });
    const orderedKeys = new Set(ordered.map((question) => question._key));
    return {
      ...section,
      questions: [...ordered, ...allSectionQuestions.filter((question) => !orderedKeys.has(question._key))],
    };
  }), [sections, allQuestions, activeSubsectionByQuestion]);
  const customPaperQuestions = useMemo(
    () => customSections.flatMap((section) => section.questions),
    [customSections],
  );

  const difficultyFilteredQuestions = useMemo(() => {
    if (mode !== 'difficulty' && mode !== 'random') return allQuestions;
    return allQuestions.filter((question) => {
      const diff = (question.difficulty ?? '').toLowerCase() as Difficulty;
      if (!diff) return true;
      return selectedDifficulties.includes(diff);
    });
  }, [allQuestions, mode, selectedDifficulties]);

  const paperQuestions = useMemo(() => {
    if (mode === 'random') {
      const shuffled = [...difficultyFilteredQuestions];
      let seed = shuffleSeed + 1;
      for (let index = shuffled.length - 1; index > 0; index--) {
        seed = (seed * 9301 + 49297) % 233280;
        const swapIndex = Math.floor((seed / 233280) * (index + 1));
        [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex]!, shuffled[index]!];
      }
      const count = Math.min(Math.max(1, Number.parseInt(questionCount, 10) || 1), 100);
      return shuffled.slice(0, count);
    }
    if (mode === 'custom') return customPaperQuestions;

    if (questionSource === 'generated' && questionCount) {
      const count = Number.parseInt(questionCount, 10);
      if (count > 0 && count < difficultyFilteredQuestions.length) {
        return difficultyFilteredQuestions.slice(0, count);
      }
    }

    return difficultyFilteredQuestions;
  }, [mode, difficultyFilteredQuestions, customPaperQuestions, questionSource, questionCount, shuffleSeed]);

  const getMarks = (question: PaperQuestion) => {
    const entered = Number.parseFloat(markByKey[question._key] ?? String(question._manualMarks ?? defaultMark));
    return Number.isFinite(entered) ? Math.max(0, entered) : 1;
  };
  const totalMarks = paperQuestions.reduce((sum, question) => sum + getMarks(question), 0);

  function toggleSubject(subject: Subject) {
    const id = getId(subject);
    const removing = selectedSubjectIds.includes(id);
    setSelectedSubjectIds((current) => removing
      ? current.filter((subjectId) => subjectId !== id)
      : [...current, id]);
    if (removing) {
      setSelectedChapterKeys((current) => current.filter((key) => !key.startsWith(`${id}::`)));
      setSelectedTopicIdsByChapter((current) => Object.fromEntries(
        Object.entries(current).filter(([key]) => !key.startsWith(`${id}::`)),
      ));
    } else {
      const names = [...selectedSubjects.map((item) => item.name), subject.name];
      setPaperSubject(names.join(', '));
    }
  }

  function toggleChapter(chapter: PaperChapter) {
    setSelectedChapterKeys((current) => current.includes(chapter._key)
      ? current.filter((key) => key !== chapter._key)
      : [...current, chapter._key]);
  }

  function toggleAllChapters(subjectId: string) {
    const subjectChapters = availableChapters.filter((chapter) => chapter._subjectId === subjectId);
    const keys = subjectChapters.map((chapter) => chapter._key);
    const allSelected = keys.length > 0 && keys.every((key) => selectedChapterKeys.includes(key));
    setSelectedChapterKeys((current) => allSelected
      ? current.filter((key) => !keys.includes(key))
      : [...new Set([...current, ...keys])]);
  }

  function toggleTopic(chapterKey: string, topicId: string) {
    setSelectedTopicIdsByChapter((current) => {
      const selected = current[chapterKey] ?? [];
      const next = selected.includes(topicId)
        ? selected.filter((id) => id !== topicId)
        : [...selected, topicId];
      return { ...current, [chapterKey]: next };
    });
  }

  function toggleAllTopics(chapterKey: string, topicIds: string[]) {
    const selected = selectedTopicIdsByChapter[chapterKey] ?? [];
    const allSelected = topicIds.length > 0 && topicIds.every((id) => selected.includes(id));
    setSelectedTopicIdsByChapter((current) => ({
      ...current,
      [chapterKey]: allSelected ? [] : topicIds,
    }));
  }

  function toggleDifficulty(difficulty: Difficulty) {
    setSelectedDifficulties((current) => current.includes(difficulty)
      ? current.filter((value) => value !== difficulty)
      : [...current, difficulty]);
  }

  function toggleCustomQuestion(questionKey: string) {
    const isInCurrentPart = customKeys.includes(questionKey) &&
      activeSubsectionByQuestion[questionKey] === activeSubsection &&
      sections.find((s) => s.id === activeSectionId)?.questionKeys.includes(questionKey);

    if (isInCurrentPart) {
      setCustomKeys((current) => current.filter((key) => key !== questionKey));
      setSections((current) => current.map((section) => ({
        ...section,
        questionKeys: section.questionKeys.filter((key) => key !== questionKey),
        orderKeys: section.orderKeys.filter((key) => key !== questionKey),
      })));
      setActiveSubsectionByQuestion((current) => {
        const next = { ...current };
        delete next[questionKey];
        return next;
      });
    } else {
      setCustomKeys((current) => current.includes(questionKey) ? current : [...current, questionKey]);
      setSections((current) => current.map((section) => {
        const cleanedKeys = section.questionKeys.filter((key) => key !== questionKey);
        const cleanedOrder = section.orderKeys.filter((key) => key !== questionKey);
        if (section.id === activeSectionId) {
          return {
            ...section,
            questionKeys: [...cleanedKeys, questionKey],
            orderKeys: [...cleanedOrder, questionKey],
          };
        }
        return {
          ...section,
          questionKeys: cleanedKeys,
          orderKeys: cleanedOrder,
        };
      }));
      setActiveSubsectionByQuestion((current) => ({
        ...current,
        [questionKey]: activeSubsection,
      }));
    }
  }

  function addSection() {
    const id = `section-${Date.now()}`;
    const next: PaperSection = {
      id,
      title: `Section ${String.fromCharCode(65 + sections.length)}`,
      subsections: ['Part 1'],
      questionKeys: [],
      questions: [],
      orderKeys: [],
    };
    setSections((current) => [...current, next]);
    setActiveSectionId(id);
    setActiveSubsection('Part 1');
  }

  function removeSection(sectionId: string) {
    setSections((current) => {
      if (current.length <= 1) return current;
      const removed = current.find((section) => section.id === sectionId);
      if (removed) {
        setCustomKeys((keys) => keys.filter((key) => !removed.questionKeys.includes(key)));
        setActiveSubsectionByQuestion((keys) => Object.fromEntries(
          Object.entries(keys).filter(([key]) => !removed.questionKeys.includes(key)),
        ));
      }
      const next = current.filter((section) => section.id !== sectionId);
      if (activeSectionId === sectionId) {
        setActiveSectionId(next[0]!.id);
        setActiveSubsection(next[0]!.subsections[0] ?? '');
      }
      return next;
    });
  }

  function addSubsection(sectionId: string) {
    const section = sections.find((item) => item.id === sectionId);
    const name = `Part ${String.fromCharCode(65 + (section?.subsections.length ?? 0))}`;
    setSections((current) => current.map((item) =>
      item.id === sectionId ? { ...item, subsections: [...item.subsections, name] } : item,
    ));
    setActiveSubsection(name);
  }

  function renameSubsection(sectionId: string, oldName: string, newName: string) {
    const section = sections.find((item) => item.id === sectionId);
    const sectionKeys = new Set(section?.questionKeys ?? []);
    setSections((current) => current.map((section) => {
      if (section.id !== sectionId) return section;
      return {
        ...section,
        subsections: section.subsections.map((name) => name === oldName ? newName : name),
        questions: section.questions.map((question) =>
          question._subsectionName === oldName ? { ...question, _subsectionName: newName } : question,
        ),
      };
    }));
    setActiveSubsectionByQuestion((current) => Object.fromEntries(
      Object.entries(current).map(([key, name]) => [key, sectionKeys.has(key) && name === oldName ? newName : name]),
    ));
    if (activeSectionId === sectionId && activeSubsection === oldName) setActiveSubsection(newName);
  }

  function removeSubsection(sectionId: string, subsectionName: string) {
    const section = sections.find((item) => item.id === sectionId);
    if (!section || section.subsections.length <= 1) return;
    const remaining = section.subsections.filter((s) => s !== subsectionName);
    setSections((current) => current.map((item) =>
      item.id === sectionId ? { ...item, subsections: remaining } : item
    ));
    if (activeSubsection === subsectionName) {
      setActiveSubsection(remaining[0] ?? '');
    }
  }

  async function pickImageDataUrl(): Promise<string | null> {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8,
        base64: true,
      });
      if (result.canceled) return null;
      const asset = result.assets[0];
      if (!asset?.base64) throw new Error('The selected image could not be read.');
      const mimeType = asset.mimeType ?? 'image/jpeg';
      return `data:${mimeType};base64,${asset.base64}`;
    } catch (error) {
      console.error('Unable to load paper image:', error);
      Alert.alert('Could not add image', error instanceof Error ? error.message : 'Choose another image and try again.');
      return null;
    }
  }

  async function addQuestionImage() {
    const image = await pickImageDataUrl();
    if (image) setManualQuestionImage(image);
  }

  async function addInstitutionLogo() {
    const image = await pickImageDataUrl();
    if (image) setInstitutionLogo(image);
  }

  async function replaceManualQuestionImage(questionKey: string) {
    const image = await pickImageDataUrl();
    if (!image) return;
    setSections((current) => current.map((section) => ({
      ...section,
      questions: section.questions.map((question) =>
        question._key === questionKey ? { ...question, _imageDataUrl: image } : question,
      ),
    })));
  }

  function addManualQuestion() {
    const text = manualQuestionText.trim();
    if (!text && !manualQuestionImage) {
      Alert.alert('Add a question', 'Type a question or add a question image first.');
      return;
    }
    const id = `manual:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`;
    const enteredMarks = Number.parseFloat(manualQuestionMarks || defaultMark);
    const activeChapter = selectedChapters[0] ?? availableChapters[0];
    const question: PaperQuestion = {
      question: text || 'Question shown in image',
      options: [],
      answer: '',
      _key: id,
      _subjectId: activeChapter?._subjectId ?? selectedSubjectIds[0] ?? '',
      _subjectName: activeChapter?._subjectName ?? paperSubject ?? subjectName,
      _chapterKey: activeChapter?._key ?? 'manual',
      _chapterName: activeChapter?.name ?? subjectName,
      _imageDataUrl: manualQuestionImage || undefined,
      _manualMarks: Number.isFinite(enteredMarks) ? Math.max(0, enteredMarks) : 1,
      _subsectionName: activeSubsection,
    };
    setSections((current) => current.map((section) =>
      section.id === activeSectionId
        ? { ...section, questions: [...section.questions, question], orderKeys: [...section.orderKeys, id] }
        : section,
    ));
    setManualQuestionText('');
    setManualQuestionImage('');
    setManualQuestionMarks(defaultMark);
  }

  function removePaperQuestion(question: PaperQuestion) {
    if (question._key.startsWith('manual:')) {
      setSections((current) => current.map((section) => ({
        ...section,
        questions: section.questions.filter((item) => item._key !== question._key),
        orderKeys: section.orderKeys.filter((key) => key !== question._key),
      })));
      return;
    }
    setCustomKeys((current) => current.filter((key) => key !== question._key));
    setSections((current) => current.map((section) => ({
      ...section,
      questionKeys: section.questionKeys.filter((key) => key !== question._key),
      orderKeys: section.orderKeys.filter((key) => key !== question._key),
    })));
    setActiveSubsectionByQuestion((current) => {
      const next = { ...current };
      delete next[question._key];
      return next;
    });
  }

  function movePaperQuestion(sectionId: string, questionKey: string, offset: number) {
    setSections((current) => current.map((section) => {
      if (section.id !== sectionId) return section;
      const keys = [...section.orderKeys];
      const index = keys.indexOf(questionKey);
      if (index < 0) return section;
      const subsectionFor = (key: string) =>
        section.questions.find((question) => question._key === key)?._subsectionName
        ?? activeSubsectionByQuestion[key]
        ?? '';
      const subsection = subsectionFor(questionKey);
      let target = index + offset;
      while (target >= 0 && target < keys.length && subsectionFor(keys[target]!) !== subsection) {
        target += offset;
      }
      if (target < 0 || target >= keys.length) return section;
      [keys[index], keys[target]] = [keys[target]!, keys[index]!];
      return { ...section, orderKeys: keys };
    }));
  }

  async function generateQuestionPool() {
    if (!selectedChapters.length || !boardId || !standardId) {
      setGenerationError('Select at least one chapter before generating questions.');
      return;
    }
    setIsGenerating(true);
    setGenerationError('');
    const requestedDifficulties = mode === 'difficulty' || mode === 'random'
      ? selectedDifficulties
      : ['medium' as Difficulty];
    if (!requestedDifficulties.length) {
      setGenerationError('Choose at least one difficulty level.');
      setIsGenerating(false);
      return;
    }

    try {
      const generated: PaperQuestion[] = [];
      for (const chapter of selectedChapters) {
        const totalRequested = mode === 'random'
          ? Math.min(Math.max(1, Number.parseInt(questionCount, 10) || 1), 100)
          : 5 * requestedDifficulties.length;
        const perDifficultyCount = mode === 'random'
          ? Math.min(25, Math.ceil(totalRequested / requestedDifficulties.length))
          : 5;
        for (const difficulty of requestedDifficulties) {
          const response = await eduApi.generateQuestions({
            board: boardId || boardName || '',
            standard: standardId || standardName || '',
            subject: paperSubject.trim() || subjectName,
            chapter: chapter.name,
            options: {
              mode: 'mcq',
              count: perDifficultyCount,
              seed: Math.floor(Math.random() * 9_000_000),
              difficulty,
            },
            freshQuestions: true,
          });
          const result = response as {
            questions?: unknown[];
            data?: { questions?: unknown[] };
            result?: { questions?: unknown[] };
          };
          const rawQuestions = Array.isArray(response)
            ? response
            : result.questions ?? result.data?.questions ?? result.result?.questions ?? [];
          rawQuestions.forEach((rawQuestion, index) => {
            if (!rawQuestion || typeof rawQuestion !== 'object') return;
            const question = normalizeYunoraQuestion(rawQuestion);
            if (!question.question.trim() || !question.options || question.options.length < 2) return;
            const id = getId(rawQuestion as { id?: string; _id?: string }) || index;
            generated.push({
              ...question,
              difficulty: question.difficulty ?? difficulty,
              chapterId: getId(chapter),
              _key: `generated:${getId(chapter)}:${difficulty}:${id}:${generated.length}`,
              _subjectId: chapter._subjectId,
              _subjectName: chapter._subjectName,
              _chapterKey: chapter._key,
              _chapterName: chapter.name,
            });
          });
        }
      }
      if (!generated.length) {
        throw new Error('The question service returned no multiple-choice questions for this selection.');
      }
      setGeneratedPool((current) => [...current, ...generated]);
      setQuestionSource('generated');
      setShuffleSeed((seed) => seed + 1);
    } catch (error) {
      console.error('Unable to generate question paper questions:', error);
      setGenerationError(error instanceof Error ? error.message : 'Question generation failed. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  }

  function isOptionMarkedCorrect(letter: string, optionText: string, currentAnswer: string): boolean {
    if (!currentAnswer) return false;
    const trimmed = currentAnswer.trim();
    const matchLetter = trimmed.match(/^([A-E])(?:[).:]|$)/i)?.[1]?.toUpperCase();
    if (matchLetter === letter) return true;
    if (cleanOptionText(trimmed).toLowerCase() === cleanOptionText(optionText).toLowerCase()) return true;
    return false;
  }

  const renderQuestionPreviewCard = (question: PaperQuestion, index: number, isCustomReview?: boolean, sectionId?: string) => {
    const isEditing = editingQuestionKey === question._key;
    const currentPrompt = editedQuestionByKey[question._key] ?? question.question;
    const currentOptions = editedOptionsByKey[question._key] ?? question.options ?? [];
    const currentAnswer = editedAnswerByKey[question._key] ?? question.answer ?? '';
    const currentExplanation = editedExplanationByKey[question._key] ?? question.explanation ?? question.solution ?? '';
    const resolvedAnswer = formatAnswer({
      ...question,
      _editedAnswer: currentAnswer,
      _editedOptions: currentOptions,
    });

    return (
      <View key={question._key} style={styles.previewCard}>
        <View style={styles.previewHeading}>
          <View style={styles.previewHeadingLeft}>
            <View style={styles.previewNumBadge}>
              <Text style={styles.previewNumber}>Q{index + 1}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.questionChapter} numberOfLines={1}>
                {question._chapterName}{question.difficulty ? ` · ${question.difficulty}` : ''}
              </Text>
              <Text style={styles.questionSourceTag}>{getQuestionSourceLabel(question)}</Text>
            </View>
          </View>

          <View style={styles.markField}>
            <TextInput
              style={styles.markInput}
              value={markByKey[question._key] ?? String(question._manualMarks ?? defaultMark)}
              onChangeText={(value) => setMarkByKey((current) => ({ ...current, [question._key]: value.replace(/[^0-9.]/g, '').slice(0, 5) }))}
              keyboardType="decimal-pad"
            />
            <Text style={styles.markSuffix}>marks</Text>
          </View>

          {isCustomReview && sectionId && (
            <View style={styles.customOrderActions}>
              <Pressable onPress={() => movePaperQuestion(sectionId, question._key, -1)} accessibilityLabel="Move up">
                <Ionicons name="arrow-up" size={16} color="#A84932" />
              </Pressable>
              <Pressable onPress={() => movePaperQuestion(sectionId, question._key, 1)} accessibilityLabel="Move down">
                <Ionicons name="arrow-down" size={16} color="#A84932" />
              </Pressable>
              <Pressable onPress={() => removePaperQuestion(question)} accessibilityLabel="Remove question">
                <Ionicons name="close-circle-outline" size={18} color="#A84932" />
              </Pressable>
            </View>
          )}
        </View>

        {isEditing ? (
          <View style={styles.questionEditorCard}>
            <Text style={styles.editorFieldLabel}>Question Prompt (Math $x^2$ supported)</Text>
            <TextInput
              style={styles.editorTextInput}
              value={currentPrompt}
              onChangeText={(val) => setEditedQuestionByKey((current) => ({ ...current, [question._key]: val }))}
              multiline
              placeholder="Type the question text..."
            />

            {currentOptions.length > 0 && (
              <>
                <Text style={[styles.editorFieldLabel, { marginTop: 12 }]}>Options & Correct Answer</Text>
                <Text style={styles.editorHelperText}>Tap the circle next to an option to select it as the correct answer.</Text>
                {currentOptions.map((option, optIdx) => {
                  const letter = String.fromCharCode(65 + optIdx);
                  const isSelected = isOptionMarkedCorrect(letter, option, currentAnswer);
                  return (
                    <View key={`${question._key}-edit-opt-${optIdx}`} style={styles.editorOptionRow}>
                      <Pressable
                        style={[styles.editorCorrectRadio, isSelected && styles.editorCorrectRadioActive]}
                        onPress={() => setEditedAnswerByKey((current) => ({ ...current, [question._key]: letter }))}
                        accessibilityLabel={`Mark option ${letter} as correct`}
                      >
                        <Ionicons
                          name={isSelected ? 'checkmark-circle' : 'ellipse-outline'}
                          size={20}
                          color={isSelected ? '#4F936C' : '#A8988C'}
                        />
                      </Pressable>
                      <View style={styles.editorOptionBadge}>
                        <Text style={styles.editorOptionBadgeText}>{letter}</Text>
                      </View>
                      <TextInput
                        style={styles.editorOptionInput}
                        value={cleanOptionText(option)}
                        onChangeText={(val) => {
                          setEditedOptionsByKey((current) => {
                            const existing = current[question._key] ?? [...(question.options ?? [])];
                            const next = [...existing];
                            next[optIdx] = val;
                            return { ...current, [question._key]: next };
                          });
                        }}
                        placeholder={`Option ${letter}`}
                      />
                      {currentOptions.length > 2 && (
                        <Pressable
                          style={styles.editorRemoveOptBtn}
                          onPress={() => {
                            setEditedOptionsByKey((current) => {
                              const existing = current[question._key] ?? [...(question.options ?? [])];
                              return { ...current, [question._key]: existing.filter((_, i) => i !== optIdx) };
                            });
                          }}
                        >
                          <Ionicons name="trash-outline" size={16} color="#C85C3E" />
                        </Pressable>
                      )}
                    </View>
                  );
                })}

                {currentOptions.length < 6 && (
                  <Pressable
                    style={styles.editorAddOptBtn}
                    onPress={() => {
                      setEditedOptionsByKey((current) => {
                        const existing = current[question._key] ?? [...(question.options ?? [])];
                        return { ...current, [question._key]: [...existing, `Option ${String.fromCharCode(65 + existing.length)}`] };
                      });
                    }}
                  >
                    <Ionicons name="add-circle-outline" size={16} color="#7653A4" />
                    <Text style={styles.editorAddOptBtnText}>Add Option {String.fromCharCode(65 + currentOptions.length)}</Text>
                  </Pressable>
                )}
              </>
            )}

            <Text style={[styles.editorFieldLabel, { marginTop: 12 }]}>Correct Answer Summary</Text>
            <TextInput
              style={styles.editorSingleInput}
              value={currentAnswer}
              onChangeText={(val) => setEditedAnswerByKey((current) => ({ ...current, [question._key]: val }))}
              placeholder="e.g. B or answer text"
            />

            <Text style={[styles.editorFieldLabel, { marginTop: 12 }]}>Step-by-Step Explanation / Solution</Text>
            <TextInput
              style={[styles.editorTextInput, { minHeight: 65 }]}
              value={currentExplanation}
              onChangeText={(val) => setEditedExplanationByKey((current) => ({ ...current, [question._key]: val }))}
              multiline
              placeholder="Explain why this answer is correct..."
            />

            <View style={styles.editorActionRow}>
              <Pressable
                style={styles.editorResetBtn}
                onPress={() => {
                  setEditedQuestionByKey((c) => { const n = { ...c }; delete n[question._key]; return n; });
                  setEditedOptionsByKey((c) => { const n = { ...c }; delete n[question._key]; return n; });
                  setEditedAnswerByKey((c) => { const n = { ...c }; delete n[question._key]; return n; });
                  setEditedExplanationByKey((c) => { const n = { ...c }; delete n[question._key]; return n; });
                  setEditingQuestionKey(null);
                }}
              >
                <Ionicons name="refresh-outline" size={14} color="#8D7A6F" />
                <Text style={styles.editorResetBtnText}>Reset to Original</Text>
              </Pressable>
              <Pressable
                style={styles.editorSaveBtn}
                onPress={() => setEditingQuestionKey(null)}
              >
                <Ionicons name="checkmark-done" size={16} color="#FFF" />
                <Text style={styles.editorSaveBtnText}>Save & Done</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <View style={styles.questionDisplayBlock}>
            <View style={styles.mathTextContainer}>
              <MathText text={currentPrompt} style={styles.previewQuestionMath} />
            </View>
            <Pressable
              style={styles.editQuestionToggle}
              onPress={() => setEditingQuestionKey(question._key)}
              accessibilityLabel="Edit question prompt, options and explanation"
            >
              <Ionicons name="pencil" size={12} color="#C85C3E" />
              <Text style={styles.editQuestionToggleText}>Edit</Text>
            </Pressable>
          </View>
        )}

        {question._imageDataUrl ? <Image source={{ uri: question._imageDataUrl }} style={styles.manualImagePreview} resizeMode="contain" /> : null}

        {!isEditing && currentOptions.length > 0 && (
          <View style={styles.optionsList}>
            {currentOptions.map((option, optionIndex) => (
              <View key={`${question._key}-option-${optionIndex}`} style={styles.optionItemRow}>
                <View style={styles.optionLetterBadge}>
                  <Text style={styles.optionLetterText}>{String.fromCharCode(65 + optionIndex)}</Text>
                </View>
                <View style={styles.optionContentWrap}>
                  <MathText text={cleanOptionText(option)} style={styles.optionMathText} />
                </View>
              </View>
            ))}
          </View>
        )}

        {!isEditing && answerKeyMode === 'inline' && (
          <View style={styles.keyPreview}>
            {resolvedAnswer && (
              <View style={styles.answerRow}>
                <Text style={styles.keyLabel}>Correct Answer:</Text>
                <View style={styles.answerMathWrap}>
                  <MathText text={resolvedAnswer} style={styles.keyText} />
                </View>
              </View>
            )}
            {currentExplanation ? (
              <View style={styles.explanationRow}>
                <Text style={styles.explanationLabel}>Explanation:</Text>
                <View style={styles.explanationMathWrap}>
                  <MathText text={currentExplanation} style={styles.explanationText} />
                </View>
              </View>
            ) : null}
          </View>
        )}
      </View>
    );
  };

  function getGeneratedHtml(): string {
    return makeQuestionSheetHtml({
      subject: paperSubject.trim() || subjectName,
      title: paperTitle.trim() || `${subjectName} Practice Paper`,
      instructions: instructions.trim(),
      institution,
      institutionLogo,
      showStudentFields,
      examName,
      grade,
      duration,
      watermark,
      footer,
      pageSize,
      showPageNumbers,
      questions: paperQuestions.map((question) => ({
        ...question,
        _editedText: editedQuestionByKey[question._key] ?? question.question,
        _editedOptions: editedOptionsByKey[question._key] ?? question.options,
        _editedAnswer: editedAnswerByKey[question._key] ?? question.answer,
        _editedExplanation: editedExplanationByKey[question._key] ?? question.explanation ?? question.solution,
      })),
      sections: mode === 'custom' ? customSections.map((section) => ({
        ...section,
        questions: section.questions.map((question) => ({
          ...question,
          _editedText: editedQuestionByKey[question._key] ?? question.question,
          _editedOptions: editedOptionsByKey[question._key] ?? question.options,
          _editedAnswer: editedAnswerByKey[question._key] ?? question.answer,
          _editedExplanation: editedExplanationByKey[question._key] ?? question.explanation ?? question.solution,
        })),
      })) : undefined,
      marks: getMarks,
      answerKeyMode,
    });
  }

  async function createPdf() {
    if (!paperQuestions.length) return;
    try {
      const html = getGeneratedHtml();

      if (Platform.OS === 'web') {
        printHtmlOnWeb(html);
        return;
      }

      await Print.printAsync({ html });
    } catch (error) {
      console.error('Unable to create question PDF:', error);
      Alert.alert('Could not create PDF', 'Please try again in a moment.');
    }
  }

  function openInNewTab() {
    if (!paperQuestions.length || typeof window === 'undefined') return;
    try {
      const html = getGeneratedHtml();
      const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
    } catch (error) {
      console.error('Unable to open in new tab:', error);
    }
  }

  const topPad = insets.top + (Platform.OS === 'web' ? 24 : 0);
  const canExport = paperQuestions.length > 0 && (questionSource === 'generated' || !isLoadingQuestions);

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: topPad + (isWideScreen ? 8 : 14) }, isWideScreen && styles.headerWide]}>
        <Pressable
          onPress={() => {
            if (router.canGoBack()) router.back();
            else router.replace({ pathname: '/chapters', params: { subjectId, subjectName } });
          }}
          style={styles.backButton}
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={20} color="#3D2D27" />
        </Pressable>
        <View style={styles.headerCopy}>
          <Text style={styles.title}>Question Paper Builder</Text>
          <Text style={styles.subtitle}>
            {subjectName} · {paperQuestions.length} selected · {totalMarks} marks {questionSource === 'generated' ? '· 🌟 AI Pool' : questionSource === 'all' ? '· 🔀 Combined' : '· 🏛️ Bank'}
          </Text>
        </View>
        <View style={styles.headerActionsRow}>
          <Pressable
            style={[styles.headerSlideButton, !canExport && styles.headerPreviewButtonDisabled]}
            onPress={() => {
              if (!paperQuestions.length) return;
              const resolvedQuestions = paperQuestions.map((q) => ({
                ...q,
                question: editedQuestionByKey[q._key] ?? q.question,
                options: editedOptionsByKey[q._key] ?? q.options,
                answer: editedAnswerByKey[q._key] ?? q.answer,
                explanation: editedExplanationByKey[q._key] ?? q.explanation ?? q.solution,
              }));
              const slideSessionId = saveQuestions(resolvedQuestions as any);
              router.push({
                pathname: '/classroom-slides' as any,
                params: {
                  sessionId: slideSessionId,
                  title: paperTitle.trim() || `${paperSubject} Exam Paper`,
                  subject: paperSubject.trim() || subjectName,
                },
              });
            }}
            disabled={!canExport}
            accessibilityLabel="Launch Smartboard slide deck"
          >
            <Ionicons name="tv-outline" size={15} color={canExport ? '#7653A4' : '#A8988C'} />
            <Text style={[styles.headerSlideButtonText, !canExport && styles.headerPreviewButtonTextDisabled]}>Slides</Text>
          </Pressable>
          {Platform.OS === 'web' && (
            <Pressable
              style={[styles.headerPreviewButton, !canExport && styles.headerPreviewButtonDisabled]}
              onPress={openInNewTab}
              disabled={!canExport}
              accessibilityLabel="Open question paper in new tab"
            >
              <Ionicons name="open-outline" size={15} color={canExport ? '#76645B' : '#A8988C'} />
              <Text style={[styles.headerPreviewButtonText, !canExport && styles.headerPreviewButtonTextDisabled]}>Preview</Text>
            </Pressable>
          )}
          <Pressable
            style={[styles.headerExportButton, !canExport && styles.headerExportButtonDisabled]}
            onPress={createPdf}
            disabled={!canExport}
            accessibilityLabel="Print or save as PDF"
          >
            <Ionicons name="print-outline" size={16} color={canExport ? '#FFF' : '#A8988C'} />
            <Text style={[styles.headerExportButtonText, !canExport && styles.headerExportButtonTextDisabled]}>Export PDF</Text>
          </Pressable>
        </View>
      </View>

      {/* ── MOBILE TAB BAR (Only on mobile / compact screens) ── */}
      {!isWideScreen && (
        <View style={styles.mobileTabBar}>
          <Pressable
            style={[styles.mobileTabBtn, activeTab === 'setup' && styles.mobileTabBtnActive]}
            onPress={() => setActiveTab('setup')}
          >
            <Ionicons name="options-outline" size={16} color={activeTab === 'setup' ? '#C85C3E' : '#76645B'} />
            <Text style={[styles.mobileTabBtnText, activeTab === 'setup' && styles.mobileTabBtnTextActive]}>
              Setup & Design
            </Text>
          </Pressable>
          <Pressable
            style={[styles.mobileTabBtn, activeTab === 'preview' && styles.mobileTabBtnActive]}
            onPress={() => setActiveTab('preview')}
          >
            <Ionicons name="document-text-outline" size={16} color={activeTab === 'preview' ? '#C85C3E' : '#76645B'} />
            <Text style={[styles.mobileTabBtnText, activeTab === 'preview' && styles.mobileTabBtnTextActive]}>
              Paper Preview ({paperQuestions.length})
            </Text>
          </Pressable>
        </View>
      )}

      <ScrollView
        contentContainerStyle={[styles.content, isWideScreen && styles.contentWide]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.builderColumns, isWideScreen && styles.builderColumnsWide]}>
          {/* ══════════════════════════════════════════════════════
              SETUP & DESIGN COLUMN (Always visible on desktop, tab-controlled on mobile)
          ══════════════════════════════════════════════════════ */}
          {(isWideScreen || activeTab === 'setup') && (
            <View style={[styles.builderColumn, isWideScreen && styles.setupColumn]}>
              {/* Card 1: Question Pool & Chapter Selection */}
              <View style={styles.controlCard}>
                <View style={styles.cardHeaderRow}>
                  <Ionicons name="library" size={18} color="#C85C3E" />
                  <Text style={styles.sectionTitle}>1. Question Selection</Text>
                </View>

                {/* ── QUESTION SOURCE SELECTOR ── */}
                <View style={styles.sourceSelectorCard}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Text style={styles.fieldLabel}>Question Source</Text>
                    {questionSource === 'generated' && activeGeneratedPool.length > 0 && (
                      <View style={styles.activeSourcePill}>
                        <Ionicons name="sparkles" size={11} color="#C85C3E" />
                        <Text style={styles.activeSourcePillText}>AI Chat Pool Active</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.helperText}>
                    Switch between questions generated in your AI chat session, the chapter question bank, or combine both.
                  </Text>
                  <View style={styles.sourceTabsRow}>
                    <Pressable
                      style={[
                        styles.sourceTabBtn,
                        questionSource === 'generated' && styles.sourceTabBtnActive,
                      ]}
                      onPress={() => setQuestionSource('generated')}
                      accessibilityLabel="Show AI Generated questions"
                    >
                      <Ionicons
                        name="sparkles"
                        size={15}
                        color={questionSource === 'generated' ? '#C85C3E' : '#76645B'}
                      />
                      <Text
                        style={[
                          styles.sourceTabBtnText,
                          questionSource === 'generated' && styles.sourceTabBtnTextActive,
                        ]}
                      >
                        AI Generated ({activeGeneratedPool.length})
                      </Text>
                    </Pressable>

                    <Pressable
                      style={[
                        styles.sourceTabBtn,
                        questionSource === 'bank' && styles.sourceTabBtnActive,
                      ]}
                      onPress={() => setQuestionSource('bank')}
                      accessibilityLabel="Show Question Bank questions"
                    >
                      <Ionicons
                        name="library-outline"
                        size={15}
                        color={questionSource === 'bank' ? '#C85C3E' : '#76645B'}
                      />
                      <Text
                        style={[
                          styles.sourceTabBtnText,
                          questionSource === 'bank' && styles.sourceTabBtnTextActive,
                        ]}
                      >
                        Question Bank ({bankQuestionsList.length})
                      </Text>
                    </Pressable>

                    <Pressable
                      style={[
                        styles.sourceTabBtn,
                        questionSource === 'all' && styles.sourceTabBtnActive,
                      ]}
                      onPress={() => setQuestionSource('all')}
                      accessibilityLabel="Show Combined questions"
                    >
                      <Ionicons
                        name="layers-outline"
                        size={15}
                        color={questionSource === 'all' ? '#C85C3E' : '#76645B'}
                      />
                      <Text
                        style={[
                          styles.sourceTabBtnText,
                          questionSource === 'all' && styles.sourceTabBtnTextActive,
                        ]}
                      >
                        Combined ({activeGeneratedPool.length + bankQuestionsList.length})
                      </Text>
                    </Pressable>
                  </View>
                </View>

                {/* Language selector — only show if > 1 language available */}
                {availableLanguages.length > 1 && (
                  <View style={{ marginBottom: 14 }}>
                    <Text style={styles.fieldLabel}>Question Language</Text>
                    <Text style={styles.helperText}>Only languages available in this chapter's question bank are shown.</Text>
                    <View style={[styles.chipRow, { flexWrap: 'wrap', gap: 8, marginTop: 6 }]}>
                      {availableLanguages.map((lang) => {
                        const isSelected = selectedLanguage === lang.code;
                        return (
                          <Pressable
                            key={lang.code}
                            style={[
                              styles.subsectionChip,
                              isSelected && styles.subsectionChipActive,
                              { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12 },
                            ]}
                            onPress={() => {
                              setSelectedLanguage(lang.code);
                              if (lang.code !== 'en' && questionSource === 'generated') {
                                setQuestionSource('bank');
                              }
                            }}
                            accessibilityLabel={`Select ${lang.name} questions`}
                          >
                            <Text style={[
                              styles.subsectionChipText,
                              isSelected && styles.subsectionChipTextActive,
                              { fontWeight: isSelected ? '700' : '500' },
                            ]}>
                              {lang.native}
                            </Text>
                            <Text style={[
                              { fontSize: 10, color: isSelected ? '#C85C3E' : '#A8988C' },
                            ]}>
                              {lang.name}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                    {selectedLanguage !== 'en' && questionSource === 'generated' && (
                      <Text style={[styles.helperText, { color: '#C85C3E', marginTop: 4 }]}>
                        Viewing AI questions in session. Switch to Question Bank to view {selectedLanguage === 'gu' ? 'Gujarati' : 'Hindi'} bank questions.
                      </Text>
                    )}
                  </View>
                )}

                <Text style={styles.fieldLabel}>Paper Generation Mode</Text>
                <View style={styles.modeGrid}>
                  {MODES.map((item) => (
                    <Pressable
                      key={item.value}
                      style={[styles.modeCard, mode === item.value && styles.modeCardSelected]}
                      onPress={() => setMode(item.value)}
                    >
                      <Ionicons name={item.icon} size={16} color={mode === item.value ? '#C85C3E' : '#8B786D'} />
                      <Text style={[styles.modeText, mode === item.value && styles.modeTextSelected]}>{item.label}</Text>
                    </Pressable>
                  ))}
                </View>

                {/* Chapter selection */}
                <View style={styles.sectionHeader}>
                  <Text style={styles.fieldLabel}>Chapters ({selectedChapterKeys.length}/{availableChapters.length})</Text>
                  <Pressable onPress={() => {
                    const allKeys = availableChapters.map((c) => c._key);
                    setSelectedChapterKeys(selectedChapterKeys.length === allKeys.length ? [] : allKeys);
                  }}>
                    <Text style={styles.linkText}>
                      {selectedChapterKeys.length === availableChapters.length && availableChapters.length > 0 ? 'Clear all' : 'Select all'}
                    </Text>
                  </Pressable>
                </View>

                {isLoadingChapters ? (
                  <ActivityIndicator color="#C85C3E" style={styles.loader} />
                ) : hasChapterError ? (
                  <Text style={styles.message}>Couldn’t load chapters. Check your connection.</Text>
                ) : availableChapters.length ? (
                  <View style={styles.chapterChipsWrap}>
                    {availableChapters.map((chapter: PaperChapter) => {
                      const selected = selectedChapterKeys.includes(chapter._key);
                      return (
                        <Pressable
                          key={chapter._key}
                          style={[styles.chapterChip, selected && styles.chapterChipSelected]}
                          onPress={() => toggleChapter(chapter)}
                        >
                          <Ionicons name={selected ? 'checkmark-circle' : 'ellipse-outline'} size={15} color={selected ? '#C85C3E' : '#B7A69A'} />
                          <Text style={[styles.chapterChipText, selected && styles.chapterChipTextSelected]} numberOfLines={1}>{chapter.name}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                ) : (
                  <Text style={styles.message}>No chapters available for this subject.</Text>
                )}

                {/* If Difficulty / Random Mode */}
                {(mode === 'difficulty' || mode === 'random') && (
                  <View style={{ marginTop: 14 }}>
                    <Text style={styles.fieldLabel}>Difficulty Filter</Text>
                    <View style={styles.chipRow}>
                      {DIFFICULTIES.map((difficulty) => {
                        const selected = selectedDifficulties.includes(difficulty.value);
                        return (
                          <Pressable
                            key={difficulty.value}
                            style={[styles.difficultyChip, selected && { borderColor: difficulty.color, backgroundColor: `${difficulty.color}15` }]}
                            onPress={() => toggleDifficulty(difficulty.value)}
                          >
                            <Ionicons name={selected ? 'checkmark-circle' : 'ellipse-outline'} size={14} color={selected ? difficulty.color : '#B7A69A'} />
                            <Text style={[styles.difficultyText, selected && { color: difficulty.color, fontWeight: '800' }]}>{difficulty.label}</Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>
                )}

                {mode !== 'custom' && (
                  <View style={{ marginTop: 14 }}>
                    <View style={styles.inlineControl}>
                      <Text style={styles.fieldLabel}>
                        {questionSource === 'generated'
                          ? `Questions to Include (max ${activeGeneratedPool.length})`
                          : 'Questions in Paper (1–100)'}
                      </Text>
                      <TextInput
                        style={styles.numberInput}
                        value={questionCount}
                        onChangeText={(value) => setQuestionCount(value.replace(/[^0-9]/g, '').slice(0, 3))}
                        keyboardType="number-pad"
                        placeholder="10"
                      />
                    </View>
                    {mode === 'random' && (
                      <Pressable style={styles.secondaryButton} onPress={() => setShuffleSeed((seed) => seed + 1)}>
                        <Ionicons name="shuffle" size={15} color="#C85C3E" />
                        <Text style={styles.secondaryButtonText}>Shuffle Random Selection</Text>
                      </Pressable>
                    )}
                  </View>
                )}

                {/* Custom Sections Mode */}
                {mode === 'custom' && (
                  <View style={{ marginTop: 16 }}>
                    <View style={styles.sectionHeader}>
                      <View>
                        <Text style={styles.sectionTitle}>Paper Sections</Text>
                        <Text style={styles.helperText}>Organize into sections and subsections</Text>
                      </View>
                      <Pressable style={styles.addSectionButton} onPress={addSection}>
                        <Ionicons name="add" size={16} color="#C85C3E" />
                        <Text style={styles.linkText}>Section</Text>
                      </Pressable>
                    </View>
                    {sections.map((section, sIdx) => (
                      <View key={section.id} style={[styles.sectionEditor, activeSectionId === section.id && styles.sectionEditorActive]}>
                        <View style={styles.sectionEditorHeading}>
                          <Text style={styles.sectionIndex}>{String(sIdx + 1).padStart(2, '0')}</Text>
                          <TextInput
                            style={styles.sectionTitleInput}
                            value={section.title}
                            onChangeText={(title) => setSections((current) => current.map((item) => item.id === section.id ? { ...item, title } : item))}
                            placeholder="Section Title"
                          />
                          <Pressable disabled={sections.length <= 1} onPress={() => removeSection(section.id)}>
                            <Ionicons name="trash-outline" size={16} color={sections.length > 1 ? '#A84932' : '#C9BEB6'} />
                          </Pressable>
                        </View>
                        <View style={styles.chipRow}>
                          {section.subsections.map((subsection) => {
                            const isActive = activeSectionId === section.id && activeSubsection === subsection;
                            return (
                              <Pressable
                                key={`${section.id}:${subsection}`}
                                style={[styles.subsectionChip, isActive && styles.subsectionChipActive]}
                                onPress={() => { setActiveSectionId(section.id); setActiveSubsection(subsection); }}
                              >
                                <Text style={[styles.subsectionChipText, isActive && styles.subsectionChipTextActive]}>{subsection}</Text>
                              </Pressable>
                            );
                          })}
                          <Pressable style={styles.addSubsectionButton} onPress={() => { setActiveSectionId(section.id); addSubsection(section.id); }}>
                            <Ionicons name="add" size={13} color="#C85C3E" />
                            <Text style={styles.addSubsectionText}>Add Part</Text>
                          </Pressable>
                        </View>

                        {/* Active Part Management Box */}
                        {activeSectionId === section.id && (
                          <View style={styles.activePartBox}>
                            <View style={styles.activePartHeaderRow}>
                              <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                <Ionicons name="folder-open-outline" size={15} color="#C85C3E" />
                                <TextInput
                                  style={styles.activePartTitleInput}
                                  value={activeSubsection}
                                  onChangeText={(newName) => renameSubsection(section.id, activeSubsection, newName)}
                                  placeholder="Part Name (e.g. Part 1: MCQs)"
                                />
                              </View>
                              {section.subsections.length > 1 && (
                                <Pressable
                                  style={styles.removePartBtn}
                                  onPress={() => removeSubsection(section.id, activeSubsection)}
                                >
                                  <Ionicons name="trash-outline" size={13} color="#A84932" />
                                  <Text style={styles.removePartBtnText}>Remove Part</Text>
                                </Pressable>
                              )}
                            </View>

                            <View style={styles.partStatsRow}>
                              <Text style={styles.partStatsText}>
                                Questions in {activeSubsection}:{' '}
                                <Text style={{ fontWeight: '800', color: '#C85C3E' }}>
                                  {(section.questions.filter((q) => q._subsectionName === activeSubsection).length) +
                                   (section.questionKeys.filter((k) => activeSubsectionByQuestion[k] === activeSubsection).length)}
                                </Text>
                              </Text>
                            </View>

                            {/* Section / Part Question Assign List */}
                            <Text style={[styles.fieldLabel, { marginTop: 10, marginBottom: 4 }]}>
                              Assign Questions to {activeSubsection}
                            </Text>
                            {allQuestions.length === 0 ? (
                              <Text style={styles.emptyPartText}>
                                No questions in pool yet. Tap "Generate More with AI" below or select a chapter.
                              </Text>
                            ) : (
                              <ScrollView style={styles.partQuestionsScroll} nestedScrollEnabled>
                                {allQuestions.map((q) => {
                                  const isAssigned = customKeys.includes(q._key) &&
                                    activeSubsectionByQuestion[q._key] === activeSubsection &&
                                    section.questionKeys.includes(q._key);
                                  const assignedToOther = customKeys.includes(q._key) && !isAssigned;

                                  return (
                                    <Pressable
                                      key={`assign-${q._key}`}
                                      style={[
                                        styles.partQuestionItem,
                                        isAssigned && styles.partQuestionItemActive,
                                      ]}
                                      onPress={() => toggleCustomQuestion(q._key)}
                                    >
                                      <View style={{ flex: 1 }}>
                                        <Text style={styles.partQuestionItemPrompt} numberOfLines={2}>
                                          {q.question}
                                        </Text>
                                        <Text style={styles.partQuestionItemMeta}>
                                          {q.difficulty?.toUpperCase() || 'MEDIUM'} · {q.options?.length || 4} Options
                                          {assignedToOther ? ' (in another section/part)' : ''}
                                        </Text>
                                      </View>
                                      <View
                                        style={[
                                          styles.partAssignBadge,
                                          isAssigned ? styles.partAssignBadgeActive : null,
                                        ]}
                                      >
                                        <Ionicons
                                          name={isAssigned ? 'checkmark-circle' : 'add-circle-outline'}
                                          size={15}
                                          color={isAssigned ? '#FFFFFF' : '#C85C3E'}
                                        />
                                        <Text
                                          style={[
                                            styles.partAssignBadgeText,
                                            isAssigned ? { color: '#FFFFFF' } : null,
                                          ]}
                                        >
                                          {isAssigned ? 'Added' : 'Add'}
                                        </Text>
                                      </View>
                                    </Pressable>
                                  );
                                })}
                              </ScrollView>
                            )}

                            {/* Write Custom Question for this Part */}
                            <View style={styles.manualInputWrap}>
                              <Text style={[styles.fieldLabel, { marginBottom: 4 }]}>
                                + Write Custom Question for {activeSubsection}
                              </Text>
                              <TextInput
                                style={styles.manualTextInput}
                                value={manualQuestionText}
                                onChangeText={setManualQuestionText}
                                placeholder="Type custom question text here..."
                                multiline
                              />
                              <View style={styles.manualActionRow}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                  <Text style={styles.helperText}>Marks:</Text>
                                  <TextInput
                                    style={styles.manualMarksInput}
                                    value={manualQuestionMarks}
                                    onChangeText={setManualQuestionMarks}
                                    keyboardType="number-pad"
                                  />
                                </View>
                                <Pressable
                                  style={[styles.manualAddBtn, !manualQuestionText.trim() && { opacity: 0.5 }]}
                                  disabled={!manualQuestionText.trim()}
                                  onPress={addManualQuestion}
                                >
                                  <Ionicons name="add" size={14} color="#FFFFFF" />
                                  <Text style={styles.manualAddBtnText}>Add to Part</Text>
                                </Pressable>
                              </View>
                            </View>
                          </View>
                        )}
                      </View>
                    ))}
                  </View>
                )}

                {/* AI Generator Button */}
                <Pressable
                  style={styles.generateButton}
                  disabled={isGenerating || !selectedChapterKeys.length}
                  onPress={generateQuestionPool}
                >
                  {isGenerating ? <ActivityIndicator size="small" color="#C85C3E" /> : <Ionicons name="sparkles" size={15} color="#C85C3E" />}
                  <Text style={styles.generateButtonText}>
                    {isGenerating ? 'Generating Question Pool…' : 'Generate More with AI'}
                  </Text>
                </Pressable>
                {generationError ? <Text style={styles.errorText}>{generationError}</Text> : null}
              </View>

              {/* Card 2: Paper Header & Branding Details */}
              <View style={styles.controlCard}>
                <View style={styles.cardHeaderRow}>
                  <Ionicons name="school" size={18} color="#C85C3E" />
                  <Text style={styles.sectionTitle}>2. Paper Header & Branding</Text>
                </View>

                <Text style={styles.fieldLabel}>Paper Title</Text>
                <TextInput style={styles.textField} value={paperTitle} onChangeText={setPaperTitle} placeholder="Practice Paper Title" />

                <Text style={styles.fieldLabel}>Subject Name</Text>
                <TextInput style={styles.textField} value={paperSubject} onChangeText={setPaperSubject} placeholder={subjectName} />

                <Text style={styles.fieldLabel}>School / Institution Name</Text>
                <TextInput style={styles.textField} value={institution} onChangeText={setInstitution} placeholder="Institution name (optional)" />

                <Pressable style={styles.imageButton} onPress={addInstitutionLogo}>
                  <Ionicons name="image-outline" size={16} color="#A84932" />
                  <Text style={styles.secondaryButtonText}>{institutionLogo ? 'Change Institution Logo' : 'Add Institution Logo'}</Text>
                </Pressable>
                {institutionLogo ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 6 }}>
                    <Image source={{ uri: institutionLogo }} style={styles.logoPreview} resizeMode="contain" />
                    <Pressable onPress={() => setInstitutionLogo('')}>
                      <Text style={styles.removeImageText}>Remove</Text>
                    </Pressable>
                  </View>
                ) : null}

                <View style={styles.detailInputRow}>
                  <View style={styles.detailInputCell}>
                    <Text style={styles.fieldLabel}>Exam Name</Text>
                    <TextInput style={styles.textField} value={examName} onChangeText={setExamName} placeholder="Mid-Term / Final" />
                  </View>
                  <View style={styles.detailInputCell}>
                    <Text style={styles.fieldLabel}>Grade / Class</Text>
                    <TextInput style={styles.textField} value={grade} onChangeText={setGrade} placeholder="Grade 11" />
                  </View>
                </View>

                <View style={styles.inlineControl}>
                  <Text style={styles.fieldLabel}>Duration (minutes)</Text>
                  <TextInput
                    style={styles.numberInput}
                    value={duration}
                    onChangeText={(value) => setDuration(value.replace(/[^0-9]/g, '').slice(0, 4))}
                    placeholder="180"
                    keyboardType="number-pad"
                  />
                </View>

                <Text style={styles.fieldLabel}>General Instructions</Text>
                <TextInput
                  style={[styles.textField, styles.instructionsField]}
                  value={instructions}
                  onChangeText={setInstructions}
                  placeholder="Instructions for students..."
                  multiline
                />

                <Text style={styles.fieldLabel}>Watermark Text</Text>
                <TextInput style={styles.textField} value={watermark} onChangeText={setWatermark} placeholder="e.g. OFFICIAL EXAM · CONFIDENTIAL" />

                <Text style={styles.fieldLabel}>Footer Text</Text>
                <TextInput style={styles.textField} value={footer} onChangeText={setFooter} placeholder="e.g. Page footer note" />
              </View>

              {/* Card 3: Answer Key & Layout Mode */}
              <View style={styles.controlCard}>
                <View style={styles.cardHeaderRow}>
                  <Ionicons name="key" size={18} color="#C85C3E" />
                  <Text style={styles.sectionTitle}>3. Answer Key & Layout Mode</Text>
                </View>
                <Text style={styles.helperText}>Select how answers and solutions are included in your paper.</Text>

                <View style={styles.answerLayoutGrid}>
                  {[
                    {
                      mode: 'none' as AnswerKeyMode,
                      title: '1. Questions Only',
                      subtitle: 'Pure student exam paper (100% questions only · no answers anywhere)',
                      icon: 'document-text-outline',
                    },
                    {
                      mode: 'key_end' as AnswerKeyMode,
                      title: '2. Answer Key on Separate Page at End',
                      subtitle: 'All questions first, then a separate page break with the Answer Key table (Q1: B, Q2: A)',
                      icon: 'grid-outline',
                    },
                    {
                      mode: 'solutions_end' as AnswerKeyMode,
                      title: '3. Solutions on Separate Page at End',
                      subtitle: 'All questions first, then a separate page break with step-by-step explanations',
                      icon: 'book-outline',
                    },
                    {
                      mode: 'inline' as AnswerKeyMode,
                      title: '4. Teacher Master Mode (Inline Answers & Solutions)',
                      subtitle: 'Correct answer & explanation directly underneath each question',
                      icon: 'school-outline',
                    },
                  ].map((option) => {
                    const selected = answerKeyMode === option.mode;
                    return (
                      <Pressable
                        key={option.mode}
                        style={[styles.answerLayoutCard, selected && styles.answerLayoutCardSelected]}
                        onPress={() => setAnswerKeyMode(option.mode)}
                      >
                        <View style={[styles.answerLayoutIconWrap, selected && styles.answerLayoutIconWrapSelected]}>
                          <Ionicons name={option.icon as any} size={18} color={selected ? '#C85C3E' : '#76645B'} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.answerLayoutTitle, selected && styles.answerLayoutTitleSelected]}>
                            {option.title}
                          </Text>
                          <Text style={styles.answerLayoutSub}>
                            {option.subtitle}
                          </Text>
                        </View>
                        <Ionicons
                          name={selected ? 'checkmark-circle' : 'ellipse-outline'}
                          size={18}
                          color={selected ? '#C85C3E' : '#D1C4B8'}
                        />
                      </Pressable>
                    );
                  })}
                </View>

                {/* Marks and Page toggles */}
                <View style={styles.inlineControl}>
                  <Text style={styles.fieldLabel}>Default Marks per Question</Text>
                  <TextInput
                    style={styles.numberInput}
                    value={defaultMark}
                    onChangeText={(value) => setDefaultMark(value.replace(/[^0-9.]/g, '').slice(0, 5))}
                    keyboardType="decimal-pad"
                  />
                </View>

                <View style={styles.inlineControl}>
                  <Text style={styles.fieldLabel}>Page Size</Text>
                  <View style={styles.chipRow}>
                    {(['A4', 'Letter'] as const).map((size) => (
                      <Pressable
                        key={size}
                        style={[styles.subsectionChip, pageSize === size && styles.subsectionChipActive]}
                        onPress={() => setPageSize(size)}
                      >
                        <Text style={[styles.subsectionChipText, pageSize === size && styles.subsectionChipTextActive]}>{size}</Text>
                      </Pressable>
                    ))}
                  </View>
                </View>

                <View style={styles.switchRow}>
                  <View style={styles.switchCopy}>
                    <Text style={styles.switchTitle}>Page Numbers</Text>
                    <Text style={styles.helperText}>Number each page at footer</Text>
                  </View>
                  <Switch
                    value={showPageNumbers}
                    onValueChange={setShowPageNumbers}
                    trackColor={{ false: '#D9CEC5', true: '#DDA18D' }}
                    thumbColor={showPageNumbers ? '#C85C3E' : '#FFF'}
                  />
                </View>

                <View style={styles.switchRow}>
                  <View style={styles.switchCopy}>
                    <Text style={styles.switchTitle}>Student Name & Date Fields</Text>
                    <Text style={styles.helperText}>Print blanks on paper header</Text>
                  </View>
                  <Switch
                    value={showStudentFields}
                    onValueChange={setShowStudentFields}
                    trackColor={{ false: '#D9CEC5', true: '#DDA18D' }}
                    thumbColor={showStudentFields ? '#C85C3E' : '#FFF'}
                  />
                </View>
              </View>

              {/* On mobile: big button to jump to review */}
              {!isWideScreen && (
                <Pressable
                  style={styles.reviewPaperJumpBtn}
                  onPress={() => setActiveTab('preview')}
                >
                  <Ionicons name="document-text" size={18} color="#FFF" />
                  <Text style={styles.reviewPaperJumpBtnText}>
                    Review Paper Sheet ({paperQuestions.length} Questions) →
                  </Text>
                </Pressable>
              )}
            </View>
          )}

          {/* ══════════════════════════════════════════════════════
              PAPER SHEET PREVIEW COLUMN (Always on desktop, tab-controlled on mobile)
          ══════════════════════════════════════════════════════ */}
          {(isWideScreen || activeTab === 'preview') && (
            <View style={[styles.builderColumn, isWideScreen && styles.paperColumn]}>
              <View style={styles.paperSheetCard}>
                {/* Visual Paper Sheet Header */}
                <View style={styles.sheetHeaderCard}>
                  {institutionLogo ? <Image source={{ uri: institutionLogo }} style={styles.sheetLogo} resizeMode="contain" /> : null}
                  {institution.trim() ? <Text style={styles.sheetInstitution}>{institution.trim()}</Text> : null}
                  <Text style={styles.sheetTitle}>{paperTitle.trim() || `${paperSubject} Examination`}</Text>
                  <Text style={styles.sheetSubject}>{paperSubject.trim() || subjectName}</Text>

                  <View style={styles.sheetMetaRow}>
                    <Text style={styles.sheetMetaItem}>
                      {[grade.trim(), examName.trim(), duration.trim() ? `${duration.trim()} mins` : ''].filter(Boolean).join(' · ')}
                    </Text>
                    <Text style={styles.sheetMetaMarks}>
                      {paperQuestions.length} Questions · {totalMarks} Marks
                      {questionSource === 'generated' ? ' · 🌟 AI Generated' : questionSource === 'all' ? ' · 🔀 Combined Pool' : ' · 🏛️ Question Bank'}
                    </Text>
                  </View>

                  {showStudentFields && (
                    <View style={styles.sheetStudentFieldsRow}>
                      <Text style={styles.sheetStudentFieldText}>Name: ________________________</Text>
                      <Text style={styles.sheetStudentFieldText}>Date: ____________</Text>
                    </View>
                  )}

                  {instructions.trim() ? (
                    <View style={styles.sheetInstructionsBox}>
                      <Text style={styles.sheetInstructionsTitle}>General Instructions:</Text>
                      <Text style={styles.sheetInstructionsText}>{instructions.trim()}</Text>
                    </View>
                  ) : null}
                </View>

                {/* Question List in Sheet */}
                <View style={styles.questionsListSheet}>
                  {questionSource !== 'generated' && isLoadingQuestions ? (
                    <View style={styles.loadingRow}>
                      <ActivityIndicator color="#C85C3E" />
                      <Text style={styles.helperText}>Loading chapter questions…</Text>
                    </View>
                  ) : questionSource !== 'generated' && hasQuestionError ? (
                    <Text style={styles.message}>Some chapter questions could not be loaded.</Text>
                  ) : mode === 'custom' ? (
                    allQuestions.length ? (
                      customSections.map((section) => (
                        <View key={`review:${section.id}`} style={styles.reviewSection}>
                          <Text style={styles.reviewSectionTitle}>{section.title}</Text>
                          {section.subsections.map((subsection) => {
                            const subsectionQuestions = section.questions.filter((question) => question._subsectionName === subsection);
                            if (!subsectionQuestions.length) return null;
                            return (
                              <View key={`review:${section.id}:${subsection}`}>
                                <Text style={styles.reviewSubsectionTitle}>{subsection}</Text>
                                {subsectionQuestions.map((question, qIdx) =>
                                  renderQuestionPreviewCard(question, qIdx, true, section.id),
                                )}
                              </View>
                            );
                          })}
                          {section.questions.filter((question) => !question._subsectionName).map((question, qIdx) =>
                            renderQuestionPreviewCard(question, qIdx, true, section.id),
                          )}
                        </View>
                      ))
                    ) : (
                      <Text style={styles.message}>Select at least one chapter with available questions.</Text>
                    )
                  ) : questionSource === 'generated' && activeGeneratedPool.length === 0 ? (
                    <View style={styles.emptySheetState}>
                      <Ionicons name="sparkles-outline" size={36} color="#C9BEB6" />
                      <Text style={styles.emptySheetTitle}>No AI Generated Questions in Session</Text>
                      <Text style={styles.emptySheetSub}>
                        Generate questions in chat, tap "Generate More with AI" in Setup, or switch to Question Bank.
                      </Text>
                      <Pressable
                        style={[styles.secondaryButton, { marginTop: 12 }]}
                        onPress={() => setQuestionSource('bank')}
                      >
                        <Ionicons name="library-outline" size={15} color="#C85C3E" />
                        <Text style={styles.secondaryButtonText}>Switch to Chapter Question Bank ({bankQuestionsList.length})</Text>
                      </Pressable>
                    </View>
                  ) : paperQuestions.length > 0 ? (
                    paperQuestions.map((question, index) => renderQuestionPreviewCard(question, index))
                  ) : (
                    <View style={styles.emptySheetState}>
                      <Ionicons name="document-text-outline" size={36} color="#C9BEB6" />
                      <Text style={styles.emptySheetTitle}>No Questions Selected</Text>
                      <Text style={styles.emptySheetSub}>
                        Select chapters or generate questions in the Setup tab.
                      </Text>
                    </View>
                  )}
                </View>

                {/* ── SEPARATE END PAGE PREVIEW (For Answer Key and Solutions modes) ── */}
                {paperQuestions.length > 0 && answerKeyMode === 'key_end' && (
                  <View style={styles.separateEndPageContainer}>
                    <View style={styles.pageBreakDivider}>
                      <View style={styles.pageBreakLine} />
                      <View style={styles.pageBreakBadge}>
                        <Ionicons name="document-text-outline" size={13} color="#C85C3E" />
                        <Text style={styles.pageBreakBadgeText}>SEPARATE PAGE BREAK</Text>
                      </View>
                      <View style={styles.pageBreakLine} />
                    </View>

                    <View style={styles.separateEndPageCard}>
                      <View style={styles.separateEndPageHeader}>
                        <View style={styles.separateEndPageIconWrap}>
                          <Ionicons name="grid" size={16} color="#C85C3E" />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.separateEndPageTitle}>Official Answer Key (Separate End Page)</Text>
                          <Text style={styles.separateEndPageSub}>
                            Printed on its own separate page at the very end of the exam paper
                          </Text>
                        </View>
                      </View>

                      <View style={styles.answerKeyGridBox}>
                        {paperQuestions.map((q, idx) => {
                          const val = extractLetterOrAnswer({
                            ...q,
                            _editedAnswer: editedAnswerByKey[q._key] ?? q.answer,
                            _editedOptions: editedOptionsByKey[q._key] ?? q.options,
                          });
                          return (
                            <View key={`key-grid-${q._key}`} style={styles.answerKeyGridCell}>
                              <Text style={styles.answerKeyGridCellNum}>Q{idx + 1}</Text>
                              <Text style={styles.answerKeyGridCellVal}>{val}</Text>
                            </View>
                          );
                        })}
                      </View>
                    </View>
                  </View>
                )}

                {paperQuestions.length > 0 && answerKeyMode === 'solutions_end' && (
                  <View style={styles.separateEndPageContainer}>
                    <View style={styles.pageBreakDivider}>
                      <View style={styles.pageBreakLine} />
                      <View style={styles.pageBreakBadge}>
                        <Ionicons name="book-outline" size={13} color="#7653A4" />
                        <Text style={[styles.pageBreakBadgeText, { color: '#7653A4' }]}>SEPARATE PAGE BREAK</Text>
                      </View>
                      <View style={styles.pageBreakLine} />
                    </View>

                    <View style={styles.separateEndPageCard}>
                      <View style={styles.separateEndPageHeader}>
                        <View style={[styles.separateEndPageIconWrap, { backgroundColor: '#F3ECFA' }]}>
                          <Ionicons name="book" size={16} color="#7653A4" />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.separateEndPageTitle, { color: '#7653A4' }]}>
                            Detailed Explanations & Solutions (Separate End Page)
                          </Text>
                          <Text style={styles.separateEndPageSub}>
                            Printed on its own separate page at the very end of the exam paper
                          </Text>
                        </View>
                      </View>

                      <View style={styles.solutionsListWrap}>
                        {paperQuestions.map((q, idx) => {
                          const ans = formatAnswer({
                            ...q,
                            _editedAnswer: editedAnswerByKey[q._key] ?? q.answer,
                            _editedOptions: editedOptionsByKey[q._key] ?? q.options,
                          });
                          const expl = editedExplanationByKey[q._key] ?? q.explanation ?? q.solution ?? (ans ? `The correct choice is ${ans}.` : '');
                          return (
                            <View key={`sol-list-${q._key}`} style={styles.solutionSheetCard}>
                              <View style={styles.solutionSheetHead}>
                                <Text style={styles.solutionSheetQNum}>Question {idx + 1}</Text>
                                {ans ? (
                                  <View style={styles.solutionSheetAnsBadge}>
                                    <Text style={styles.solutionSheetAnsText}>Answer: {ans}</Text>
                                  </View>
                                ) : null}
                              </View>
                              {expl ? (
                                <MathText text={expl} style={styles.solutionSheetExplText} />
                              ) : (
                                <Text style={styles.solutionSheetEmptyText}>No step-by-step explanation provided.</Text>
                              )}
                            </View>
                          );
                        })}
                      </View>
                    </View>
                  </View>
                )}

                {/* Footer of Sheet */}
                {footer.trim() ? (
                  <View style={styles.sheetFooterWrap}>
                    <Text style={styles.sheetFooterText}>{footer.trim()}</Text>
                  </View>
                ) : null}
              </View>

              {/* Action Buttons underneath paper */}
              <View style={styles.exportButtonGroup}>
                <Pressable
                  style={[styles.createButton, !canExport && styles.createButtonDisabled]}
                  disabled={!canExport}
                  onPress={createPdf}
                >
                  <Ionicons name="print-outline" size={19} color="#FFF" />
                  <Text style={styles.createButtonText}>Print / Save as PDF · {totalMarks} Marks</Text>
                </Pressable>
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F4EEE5' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingBottom: 14, backgroundColor: '#FFFDF9', borderBottomWidth: 1, borderBottomColor: '#E9DED4' },
  headerWide: { paddingHorizontal: 32, paddingBottom: 12 },
  backButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 13, backgroundColor: '#F4EEE5' },
  headerCopy: { flex: 1 },
  title: { color: '#3D2D27', fontSize: 17, fontWeight: '800' },
  subtitle: { color: '#8B786D', fontSize: 11, marginTop: 3 },
  headerActionsRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerSlideButton: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 11, borderWidth: 1, borderColor: '#D9C8F0', backgroundColor: '#F9F5FF' },
  headerSlideButtonText: { color: '#7653A4', fontSize: 12, fontWeight: '700' },
  headerPreviewButton: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 11, borderWidth: 1, borderColor: '#E3D7CC', backgroundColor: '#FFFDF9' },
  headerPreviewButtonDisabled: { opacity: 0.5 },
  headerPreviewButtonText: { color: '#68564D', fontSize: 12, fontWeight: '700' },
  headerPreviewButtonTextDisabled: { color: '#A8988C' },
  headerExportButton: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 11, backgroundColor: '#C85C3E' },
  headerExportButtonDisabled: { backgroundColor: '#E5DCD4' },
  headerExportButtonText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  headerExportButtonTextDisabled: { color: '#A8988C' },

  /* Mobile Tab Bar */
  mobileTabBar: { flexDirection: 'row', backgroundColor: '#FFFDF9', borderBottomWidth: 1, borderBottomColor: '#E9DED4', paddingHorizontal: 16, paddingVertical: 8, gap: 10 },
  mobileTabBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 9, borderRadius: 10, borderWidth: 1, borderColor: '#E9DED4', backgroundColor: '#FFFDF9' },
  mobileTabBtnActive: { borderColor: '#C85C3E', backgroundColor: '#FFF4ED' },
  mobileTabBtnText: { fontSize: 12, fontWeight: '700', color: '#76645B' },
  mobileTabBtnTextActive: { color: '#C85C3E' },

  content: { width: '100%', alignSelf: 'center', padding: 16, paddingBottom: 36 },
  contentWide: { maxWidth: 1600, paddingHorizontal: 30, paddingTop: 20, paddingBottom: 40 },
  builderColumns: { gap: 16 },
  builderColumnsWide: { flexDirection: 'row', alignItems: 'flex-start', gap: 24 },
  builderColumn: { minWidth: 0 },
  setupColumn: { flex: 0.9 },
  paperColumn: { flex: 1.1 },

  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  sectionTitle: { color: '#3D2D27', fontSize: 14, fontWeight: '800' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 14, marginBottom: 8 },
  linkText: { color: '#C85C3E', fontSize: 11, fontWeight: '700' },
  helperText: { color: '#8B786D', fontSize: 11, lineHeight: 16, marginTop: 2 },
  fieldLabel: { color: '#76645B', fontSize: 11, fontWeight: '700', marginTop: 12, marginBottom: 6 },
  textField: { minHeight: 40, paddingHorizontal: 11, paddingVertical: 8, borderWidth: 1, borderColor: '#E9DED4', borderRadius: 10, backgroundColor: '#FFF', color: '#3D2D27', fontSize: 12 },
  instructionsField: { minHeight: 64, textAlignVertical: 'top' },
  detailInputRow: { flexDirection: 'row', gap: 10 },
  detailInputCell: { flex: 1 },

  controlCard: { padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#EFE3D8', borderRadius: 16, backgroundColor: '#FFFDF9' },
  modeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  modeCard: { minHeight: 44, flexGrow: 1, flexBasis: '46%', flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, borderWidth: 1, borderColor: '#E9DED4', borderRadius: 12, backgroundColor: '#FFF' },
  modeCardSelected: { borderColor: '#C85C3E', backgroundColor: '#FFF6F0' },
  modeText: { color: '#76645B', fontSize: 11, fontWeight: '700' },
  modeTextSelected: { color: '#A84932' },

  chapterChipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 4 },
  chapterChip: { maxWidth: 260, minHeight: 36, flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 10, borderWidth: 1, borderColor: '#E9DED4', borderRadius: 11, backgroundColor: '#FFF' },
  chapterChipSelected: { borderColor: '#C85C3E', backgroundColor: '#FFF6F0' },
  chapterChipText: { color: '#76645B', fontSize: 11, fontWeight: '600' },
  chapterChipTextSelected: { color: '#A84932', fontWeight: '700' },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 6 },
  difficultyChip: { minHeight: 32, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, borderWidth: 1, borderColor: '#E9DED4', borderRadius: 16, backgroundColor: '#FFF' },
  difficultyText: { color: '#76645B', fontSize: 11 },

  inlineControl: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 10 },
  numberInput: { minWidth: 60, height: 38, paddingHorizontal: 9, borderWidth: 1, borderColor: '#E9DED4', borderRadius: 10, backgroundColor: '#FFF', color: '#3D2D27', textAlign: 'center', fontSize: 13, fontWeight: '700' },
  secondaryButton: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8 },
  secondaryButtonText: { color: '#A84932', fontSize: 11, fontWeight: '700' },
  generateButton: { minHeight: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 14, borderWidth: 1, borderColor: '#E4C2B1', borderRadius: 12, backgroundColor: '#FFF8F3' },
  generateButtonText: { color: '#A84932', fontSize: 11, fontWeight: '800' },
  errorText: { color: '#B42318', fontSize: 11, lineHeight: 16, marginTop: 7 },
  loader: { marginVertical: 20 },
  message: { color: '#8B786D', fontSize: 11, lineHeight: 17, paddingVertical: 12 },

  imageButton: { minHeight: 36, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 10, borderWidth: 1, borderColor: '#E4C2B1', borderRadius: 10, backgroundColor: '#FFF8F3', marginTop: 10 },
  removeImageText: { color: '#A84932', fontSize: 11, fontWeight: '700' },
  logoPreview: { width: 100, height: 60, borderRadius: 8, backgroundColor: '#F8F2EC' },

  /* Answer Key Layout Grid */
  answerLayoutGrid: { gap: 8, marginTop: 8 },
  answerLayoutCard: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderWidth: 1.5, borderColor: '#E9DED4', borderRadius: 12, backgroundColor: '#FFF' },
  answerLayoutCardSelected: { borderColor: '#C85C3E', backgroundColor: '#FFF7F2' },
  answerLayoutIconWrap: { width: 34, height: 34, borderRadius: 9, backgroundColor: '#F8F2EC', alignItems: 'center', justifyContent: 'center' },
  answerLayoutIconWrapSelected: { backgroundColor: '#FBE6DD' },
  answerLayoutTitle: { fontSize: 12, fontWeight: '700', color: '#3D2D27' },
  answerLayoutTitleSelected: { color: '#A84932' },
  answerLayoutSub: { fontSize: 10, color: '#8B786D', marginTop: 2, lineHeight: 14 },

  subsectionChip: { minHeight: 30, justifyContent: 'center', paddingHorizontal: 11, borderWidth: 1, borderColor: '#E9DED4', borderRadius: 15, backgroundColor: '#FFF' },
  subsectionChipActive: { borderColor: '#C85C3E', backgroundColor: '#FFF2EB' },
  subsectionChipText: { color: '#76645B', fontSize: 11, fontWeight: '700' },
  subsectionChipTextActive: { color: '#A84932' },

  switchRow: { minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginTop: 8, borderTopWidth: 1, borderTopColor: '#F1E8E0' },
  switchCopy: { flex: 1 },
  switchTitle: { color: '#3D2D27', fontSize: 12, fontWeight: '700' },
  reviewPaperJumpBtn: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 14, backgroundColor: '#C85C3E', marginVertical: 10 },
  reviewPaperJumpBtnText: { color: '#FFF', fontSize: 13, fontWeight: '800' },

  /* ══════════════════════════════════════════════════════
     REALISTIC PAPER SHEET STYLING
  ══════════════════════════════════════════════════════ */
  paperSheetCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2D6CB',
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  sheetHeaderCard: {
    borderBottomWidth: 2,
    borderBottomColor: '#C85C3E',
    paddingBottom: 16,
    marginBottom: 20,
    alignItems: 'center',
    textAlign: 'center',
  },
  sheetLogo: { width: 70, height: 44, marginBottom: 8 },
  sheetInstitution: { fontSize: 14, fontWeight: '800', color: '#3D2D27', textTransform: 'uppercase', letterSpacing: 0.5 },
  sheetTitle: { fontSize: 18, fontWeight: '800', color: '#1F1B18', marginTop: 4 },
  sheetSubject: { fontSize: 13, fontWeight: '700', color: '#76645B', marginTop: 2 },
  sheetMetaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginTop: 12, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#F0E6DE' },
  sheetMetaItem: { fontSize: 11, color: '#76645B', fontWeight: '600' },
  sheetMetaMarks: { fontSize: 11, fontWeight: '800', color: '#C85C3E' },
  sheetStudentFieldsRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: 10 },
  sheetStudentFieldText: { fontSize: 11, color: '#5C4C44', fontWeight: '600' },
  sheetInstructionsBox: { width: '100%', marginTop: 12, padding: 10, backgroundColor: '#FAF6F2', borderRadius: 8, borderWidth: 1, borderColor: '#EDE2D8' },
  sheetInstructionsTitle: { fontSize: 11, fontWeight: '800', color: '#3D2D27', marginBottom: 2 },
  sheetInstructionsText: { fontSize: 11, color: '#5C4C44', lineHeight: 16 },

  questionsListSheet: { gap: 14 },
  emptySheetState: { alignItems: 'center', paddingVertical: 40, gap: 8 },
  emptySheetTitle: { fontSize: 14, fontWeight: '800', color: '#3D2D27' },
  emptySheetSub: { fontSize: 11, color: '#8B786D', textAlign: 'center' },
  sheetFooterWrap: { marginTop: 20, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#E9DED4', alignItems: 'center' },
  sheetFooterText: { fontSize: 10, color: '#8B786D' },

  /* Question Preview Card in Sheet */
  previewCard: { padding: 14, borderWidth: 1, borderColor: '#EDE2D8', borderRadius: 12, backgroundColor: '#FFFCFA' },
  previewHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 8 },
  previewHeadingLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  previewNumBadge: { width: 30, height: 24, borderRadius: 6, backgroundColor: '#FBEAE3', alignItems: 'center', justifyContent: 'center' },
  previewNumber: { color: '#C85C3E', fontSize: 11, fontWeight: '900' },
  questionChapter: { color: '#76645B', fontSize: 11, fontWeight: '700' },
  questionSourceTag: { color: '#A8988C', fontSize: 9, marginTop: 1 },
  markField: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  markInput: { width: 38, height: 30, paddingHorizontal: 4, borderWidth: 1, borderColor: '#E9DED4', borderRadius: 6, color: '#3D2D27', textAlign: 'center', fontSize: 11, fontWeight: '700', backgroundColor: '#FFF' },
  markSuffix: { color: '#8B786D', fontSize: 10 },
  customOrderActions: { flexDirection: 'row', alignItems: 'center', gap: 8, marginLeft: 8 },

  questionDisplayBlock: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginVertical: 4 },
  mathTextContainer: { flex: 1 },
  previewQuestionMath: { color: '#2F2925', fontSize: 13, lineHeight: 20, fontWeight: '600' },
  editQuestionToggle: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 8, borderWidth: 1, borderColor: '#F2DDD3', backgroundColor: '#FFF7F2' },
  editQuestionToggleText: { color: '#C85C3E', fontSize: 11, fontWeight: '700' },

  optionsList: { gap: 6, marginTop: 10, paddingLeft: 4 },
  optionItemRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  optionLetterBadge: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#F4ECE4', alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  optionLetterText: { color: '#76645B', fontSize: 10, fontWeight: '800' },
  optionContentWrap: { flex: 1, paddingTop: 1 },
  optionMathText: { color: '#4B3E37', fontSize: 12, lineHeight: 18 },

  /* Inline Teacher Master Key in Sheet */
  keyPreview: { marginTop: 10, padding: 10, borderRadius: 8, backgroundColor: '#F8F4EE', gap: 6 },
  answerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  keyLabel: { color: '#4F936C', fontSize: 11, fontWeight: '800' },
  keyText: { color: '#065F46', fontSize: 11, fontWeight: '700' },
  answerMathWrap: { flex: 1 },
  explanationRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginTop: 4 },
  explanationLabel: { color: '#76645B', fontSize: 11, fontWeight: '800' },
  explanationText: { color: '#5C4C44', fontSize: 11, lineHeight: 16 },
  explanationMathWrap: { flex: 1 },

  /* ══════════════════════════════════════════════════════
     SEPARATE END PAGE PREVIEW STYLES
  ══════════════════════════════════════════════════════ */
  separateEndPageContainer: { marginTop: 24 },
  pageBreakDivider: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  pageBreakLine: { flex: 1, height: 1.5, backgroundColor: '#D8C7B8' },
  pageBreakBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 11, paddingVertical: 4, borderRadius: 14, borderWidth: 1, borderColor: '#D8C7B8', backgroundColor: '#F8F2EC' },
  pageBreakBadgeText: { fontSize: 10, fontWeight: '800', color: '#C85C3E', letterSpacing: 0.5 },

  separateEndPageCard: {
    backgroundColor: '#FFFCFA',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E8DCD2',
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  separateEndPageHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingBottom: 12, marginBottom: 14, borderBottomWidth: 1.5, borderBottomColor: '#EFE7DE' },
  separateEndPageIconWrap: { width: 32, height: 32, borderRadius: 8, backgroundColor: '#FDECE6', alignItems: 'center', justifyContent: 'center' },
  separateEndPageTitle: { fontSize: 13, fontWeight: '800', color: '#3D2D27' },
  separateEndPageSub: { fontSize: 10.5, color: '#8B786D', marginTop: 2 },

  answerKeyGridBox: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  answerKeyGridCell: { minWidth: 64, flexGrow: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 11, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: '#E8DDD2', backgroundColor: '#FFF' },
  answerKeyGridCellNum: { fontSize: 11, fontWeight: '700', color: '#76645B' },
  answerKeyGridCellVal: { fontSize: 12, fontWeight: '900', color: '#C85C3E' },

  solutionsListWrap: { gap: 10 },
  solutionSheetCard: { padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#EBE2D8', backgroundColor: '#FFF' },
  solutionSheetHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  solutionSheetQNum: { fontSize: 12, fontWeight: '800', color: '#7653A4' },
  solutionSheetAnsBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, backgroundColor: '#F4EEFB' },
  solutionSheetAnsText: { fontSize: 11, fontWeight: '800', color: '#7653A4' },
  solutionSheetExplText: { fontSize: 12, color: '#3D2D27', lineHeight: 18 },
  solutionSheetEmptyText: { fontSize: 11, fontStyle: 'italic', color: '#8B786D' },

  /* ══════════════════════════════════════════════════════
     PER-QUESTION RICH INLINE EDITOR
  ══════════════════════════════════════════════════════ */
  questionEditorCard: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#C85C3E',
    backgroundColor: '#FFFDF9',
    marginTop: 6,
    marginBottom: 6,
  },
  editorFieldLabel: { fontSize: 11, fontWeight: '800', color: '#3D2D27', marginBottom: 4 },
  editorHelperText: { fontSize: 10, color: '#8B786D', marginBottom: 8 },
  editorTextInput: {
    minHeight: 52,
    borderWidth: 1,
    borderColor: '#E9DED4',
    borderRadius: 8,
    padding: 9,
    backgroundColor: '#FFF',
    color: '#2F2925',
    fontSize: 12,
    textAlignVertical: 'top',
  },
  editorSingleInput: {
    height: 38,
    borderWidth: 1,
    borderColor: '#E9DED4',
    borderRadius: 8,
    paddingHorizontal: 9,
    backgroundColor: '#FFF',
    color: '#2F2925',
    fontSize: 12,
  },
  editorOptionRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  editorCorrectRadio: { padding: 2 },
  editorCorrectRadioActive: {},
  editorOptionBadge: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#EFE7DE', alignItems: 'center', justifyContent: 'center' },
  editorOptionBadgeText: { fontSize: 10, fontWeight: '800', color: '#5C4C44' },
  editorOptionInput: { flex: 1, height: 36, borderWidth: 1, borderColor: '#E9DED4', borderRadius: 8, paddingHorizontal: 8, backgroundColor: '#FFF', fontSize: 12, color: '#2F2925' },
  editorRemoveOptBtn: { padding: 4 },
  editorAddOptBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, alignSelf: 'flex-start' },
  editorAddOptBtnText: { fontSize: 11, fontWeight: '700', color: '#7653A4' },
  editorActionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 10, marginTop: 14 },
  editorResetBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, borderWidth: 1, borderColor: '#E9DED4' },
  editorResetBtnText: { fontSize: 11, fontWeight: '600', color: '#76645B' },
  editorSaveBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8, backgroundColor: '#4F936C' },
  editorSaveBtnText: { fontSize: 11, fontWeight: '800', color: '#FFF' },

  manualImagePreview: { width: '100%', height: 160, borderRadius: 8, backgroundColor: '#F8F2EC', marginTop: 8 },
  exportButtonGroup: { marginTop: 16 },
  createButton: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 14, backgroundColor: '#C85C3E' },
  createButtonDisabled: { opacity: 0.5 },
  createButtonText: { color: '#FFF', fontSize: 13, fontWeight: '800' },
  loadingRow: { minHeight: 60, flexDirection: 'row', alignItems: 'center', gap: 10 },

  /* Custom Mode Section styling */
  sectionEditor: { padding: 12, marginBottom: 10, borderWidth: 1, borderColor: '#E9DED4', borderRadius: 12, backgroundColor: '#FFF' },
  sectionEditorActive: { borderColor: '#C85C3E', backgroundColor: '#FFFBF8' },
  sectionEditorHeading: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  sectionIndex: { color: '#C85C3E', fontSize: 12, fontWeight: '800' },
  sectionTitleInput: { flex: 1, height: 34, borderWidth: 1, borderColor: '#E9DED4', borderRadius: 8, paddingHorizontal: 8, fontSize: 12, fontWeight: '700', color: '#3D2D27' },
  addSectionButton: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: '#E4C2B1', borderRadius: 8 },
  addSubsectionButton: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: '#E4C2B1', borderStyle: 'dashed', borderRadius: 14 },
  addSubsectionText: { color: '#A84932', fontSize: 10, fontWeight: '700' },
  reviewSection: { marginBottom: 14, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#EFE7DE' },
  reviewSectionTitle: { fontSize: 14, fontWeight: '800', color: '#C85C3E', marginBottom: 8 },
  reviewSubsectionTitle: { fontSize: 12, fontWeight: '700', color: '#7653A4', marginVertical: 6 },

  /* Source Selector */
  sourceSelectorCard: { marginBottom: 14, padding: 12, borderRadius: 12, backgroundColor: '#FAF6F2', borderWidth: 1, borderColor: '#EDE2D8' },
  activeSourcePill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, backgroundColor: '#FBEAE3', borderWidth: 1, borderColor: '#F2DDD3' },
  activeSourcePillText: { fontSize: 9.5, fontWeight: '800', color: '#C85C3E' },
  sourceTabsRow: { flexDirection: 'row', gap: 6, marginTop: 8, flexWrap: 'wrap' },
  sourceTabBtn: { flex: 1, minWidth: 90, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 10, borderRadius: 8, borderWidth: 1, borderColor: '#E8DCD2', backgroundColor: '#FFF' },
  sourceTabBtnActive: { borderColor: '#C85C3E', backgroundColor: '#FBEAE3' },
  sourceTabBtnText: { fontSize: 11, fontWeight: '600', color: '#76645B' },
  sourceTabBtnTextActive: { color: '#C85C3E', fontWeight: '800' },

  /* Active Part Controls */
  activePartBox: { marginTop: 10, padding: 10, backgroundColor: '#FAF5EF', borderRadius: 10, borderWidth: 1, borderColor: '#EBDDCF' },
  activePartHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 8 },
  activePartTitleInput: { flex: 1, height: 32, fontSize: 12.5, fontWeight: '700', color: '#3D2D27', paddingVertical: 2, paddingHorizontal: 8, backgroundColor: '#FFFFFF', borderRadius: 6, borderWidth: 1, borderColor: '#E0D0C2' },
  removePartBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, backgroundColor: '#FDECE6' },
  removePartBtnText: { fontSize: 11, fontWeight: '700', color: '#A84932' },
  partStatsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 6, borderBottomWidth: 1, borderBottomColor: '#EDE2D7' },
  partStatsText: { fontSize: 11.5, color: '#76645B' },
  emptyPartText: { fontSize: 11.5, color: '#A49186', fontStyle: 'italic', paddingVertical: 8 },
  partQuestionsScroll: { maxHeight: 220, marginVertical: 6 },
  partQuestionItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: 8, marginBottom: 6, borderRadius: 8, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#EBDDCF' },
  partQuestionItemActive: { borderColor: '#C85C3E', backgroundColor: '#FFF7F4' },
  partQuestionItemPrompt: { fontSize: 12, color: '#3D2D27', fontWeight: '600', lineHeight: 16 },
  partQuestionItemMeta: { fontSize: 10, color: '#8D7A6F', marginTop: 2 },
  partAssignBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10, backgroundColor: '#F7EDE6' },
  partAssignBadgeActive: { backgroundColor: '#C85C3E' },
  partAssignBadgeText: { fontSize: 10.5, fontWeight: '700', color: '#C85C3E' },
  manualInputWrap: { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#EDE2D7' },
  manualTextInput: { fontSize: 12, color: '#3D2D27', padding: 8, backgroundColor: '#FFFFFF', borderRadius: 6, borderWidth: 1, borderColor: '#E0D0C2', minHeight: 44 },
  manualActionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 },
  manualMarksInput: { width: 40, height: 28, paddingHorizontal: 4, fontSize: 12, fontWeight: '700', textAlign: 'center', backgroundColor: '#FFFFFF', borderRadius: 6, borderWidth: 1, borderColor: '#E0D0C2', color: '#3D2D27' },
  manualAddBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, backgroundColor: '#C85C3E' },
  manualAddBtnText: { fontSize: 11, fontWeight: '700', color: '#FFFFFF' },
});
