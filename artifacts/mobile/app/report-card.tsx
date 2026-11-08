import React, { useMemo } from 'react';
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import { useApp } from '@/context/AppContext';
import { saveQuestions } from '@/store/questionStore';
import type { Question } from '@/services/api';

export default function ReportCardScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isWide = width >= 800;

  const {
    studentName,
    studentEmail,
    boardName,
    standardName,
    testHistory,
    mistakeQuestions,
  } = useApp();

  // Aggregate metrics
  const stats = useMemo(() => {
    let totalQs = 0;
    let totalScore = 0;

    const subjectMap: Record<
      string,
      { totalQs: number; score: number; testsCount: number }
    > = {};

    testHistory.forEach((t) => {
      totalQs += t.total;
      totalScore += t.score;

      const sub = t.subjectName || 'General';
      if (!subjectMap[sub]) {
        subjectMap[sub] = { totalQs: 0, score: 0, testsCount: 0 };
      }
      subjectMap[sub].totalQs += t.total;
      subjectMap[sub].score += t.score;
      subjectMap[sub].testsCount += 1;
    });

    const overallPct = totalQs > 0 ? Math.round((totalScore / totalQs) * 100) : 0;

    let letterGrade = 'N/A';
    let gpa = '0.0';
    let gradeColor = '#8B786D';

    if (totalQs > 0) {
      if (overallPct >= 90) {
        letterGrade = 'A+';
        gpa = '4.0';
        gradeColor = '#059669';
      } else if (overallPct >= 80) {
        letterGrade = 'A';
        gpa = '3.7';
        gradeColor = '#10B981';
      } else if (overallPct >= 70) {
        letterGrade = 'B+';
        gpa = '3.3';
        gradeColor = '#2563EB';
      } else if (overallPct >= 60) {
        letterGrade = 'B';
        gpa = '3.0';
        gradeColor = '#3B82F6';
      } else if (overallPct >= 50) {
        letterGrade = 'C';
        gpa = '2.5';
        gradeColor = '#F59E0B';
      } else {
        letterGrade = 'Needs Work';
        gpa = '1.8';
        gradeColor = '#EF4444';
      }
    }

    const subjectList = Object.entries(subjectMap).map(([name, data]) => {
      const pct = data.totalQs > 0 ? Math.round((data.score / data.totalQs) * 100) : 0;
      return {
        name,
        totalQs: data.totalQs,
        score: data.score,
        testsCount: data.testsCount,
        pct,
      };
    });

    return {
      totalTests: testHistory.length,
      totalQs,
      totalScore,
      overallPct,
      letterGrade,
      gpa,
      gradeColor,
      subjectList,
    };
  }, [testHistory]);

  const startMistakeDrill = () => {
    if (!mistakeQuestions.length) {
      Alert.alert('No Mistakes Recorded', 'Great job! Your mistake bank is clean.');
      return;
    }

    const converted: Question[] = mistakeQuestions.map((m) => ({
      id: m.id,
      question: m.question,
      options: m.options,
      answer: m.answer,
      solution: m.solution,
      explanation: m.explanation,
      subjectName: m.subjectName,
      chapterName: m.chapterName,
    }));

    const sessionId = saveQuestions(converted);
    router.push({
      pathname: '/test-quiz' as any,
      params: {
        sessionId,
        subjectName: 'Mistake Drill',
        mode: 'mcq',
      },
    });
  };

  const generateReportHtml = () => {
    const today = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>Academic Report Card - ${studentName || 'Student'}</title>
  <style>
    @page { size: A4; margin: 16mm; }
    * { box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; color: #1F2937; margin: 0; padding: 0; line-height: 1.5; }
    .header { text-align: center; border-bottom: 2px solid #C85C3E; padding-bottom: 14px; margin-bottom: 24px; }
    .institution { font-size: 13pt; font-weight: 700; color: #76645B; text-transform: uppercase; letter-spacing: 1px; }
    .title { font-size: 22pt; font-weight: 800; color: #111827; margin: 6px 0 2px; }
    .subtitle { font-size: 10pt; color: #6B7280; }
    .student-card { display: flex; justify-content: space-between; background: #F8F4EE; border: 1px solid #E5D7CC; border-radius: 8px; padding: 14px 18px; margin-bottom: 22px; }
    .student-item { font-size: 10pt; }
    .student-label { font-weight: 700; color: #76645B; text-transform: uppercase; font-size: 8pt; display: block; margin-bottom: 2px; }
    .student-value { font-weight: 700; color: #111827; font-size: 11pt; }
    .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 26px; }
    .kpi-card { border: 1px solid #E5E7EB; border-radius: 8px; padding: 12px; text-align: center; background: #FFF; }
    .kpi-val { font-size: 20pt; font-weight: 900; color: #C85C3E; }
    .kpi-lbl { font-size: 8.5pt; font-weight: 700; color: #6B7280; text-transform: uppercase; margin-top: 4px; }
    .section-title { font-size: 13pt; font-weight: 800; color: #1F2937; border-bottom: 1.5px solid #E5E7EB; padding-bottom: 6px; margin: 20px 0 12px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 10pt; }
    th { background: #F3F4F6; color: #374151; font-weight: 700; text-align: left; padding: 8px 10px; border: 1px solid #E5E7EB; }
    td { padding: 8px 10px; border: 1px solid #E5E7EB; }
    tr:nth-child(even) { background: #FAFAFA; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 8pt; font-weight: 800; }
    .badge-high { background: #D1FAE5; color: #065F46; }
    .badge-mid { background: #DBEAFE; color: #1E40AF; }
    .badge-low { background: #FEE2E2; color: #991B1B; }
    .footer { text-align: center; font-size: 8.5pt; color: #9CA3AF; margin-top: 40px; border-top: 1px solid #E5E7EB; padding-top: 10px; }
  </style>
</head>
<body>
  <div class="header">
    <div class="institution">Mobile Learning Academy</div>
    <div class="title">Official Academic Report Card</div>
    <div class="subtitle">Generated on ${today} · Official Student Performance Transcript</div>
  </div>

  <div class="student-card">
    <div class="student-item">
      <span class="student-label">Student Name</span>
      <span class="student-value">${studentName || 'Learner'}</span>
    </div>
    <div class="student-item">
      <span class="student-label">Grade / Class</span>
      <span class="student-value">${standardName || 'Standard'}</span>
    </div>
    <div class="student-item">
      <span class="student-label">Educational Board</span>
      <span class="student-value">${boardName || 'Board'}</span>
    </div>
    <div class="student-item">
      <span class="student-label">Status</span>
      <span class="student-value" style="color:#059669;">ACTIVE</span>
    </div>
  </div>

  <div class="kpi-grid">
    <div class="kpi-card">
      <div class="kpi-val">${stats.letterGrade}</div>
      <div class="kpi-lbl">Letter Grade</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-val">${stats.overallPct}%</div>
      <div class="kpi-lbl">Cumulative Accuracy</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-val">${stats.totalTests}</div>
      <div class="kpi-lbl">Assessments Completed</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-val">${stats.totalScore}/${stats.totalQs}</div>
      <div class="kpi-lbl">Marks Earned</div>
    </div>
  </div>

  <div class="section-title">Subject Mastery & Competency Breakdown</div>
  <table>
    <thead>
      <tr>
        <th>Subject Name</th>
        <th>Tests Taken</th>
        <th>Score / Total</th>
        <th>Accuracy</th>
        <th>Mastery Level</th>
      </tr>
    </thead>
    <tbody>
      ${
        stats.subjectList.length
          ? stats.subjectList
              .map(
                (s) => `<tr>
                  <td><b>${s.name}</b></td>
                  <td>${s.testsCount}</td>
                  <td>${s.score} / ${s.totalQs}</td>
                  <td><b>${s.pct}%</b></td>
                  <td>
                    <span class="badge ${
                      s.pct >= 85 ? 'badge-high' : s.pct >= 65 ? 'badge-mid' : 'badge-low'
                    }">
                      ${s.pct >= 85 ? 'MASTERED' : s.pct >= 65 ? 'PROFICIENT' : 'NEEDS PRACTICE'}
                    </span>
                  </td>
                </tr>`
              )
              .join('')
          : '<tr><td colspan="5" style="text-align:center;color:#9CA3AF;">No test records logged yet.</td></tr>'
      }
    </tbody>
  </table>

  <div class="section-title">Recent Assessment Examination Log</div>
  <table>
    <thead>
      <tr>
        <th>Date</th>
        <th>Subject</th>
        <th>Mode</th>
        <th>Score</th>
        <th>Percentage</th>
      </tr>
    </thead>
    <tbody>
      ${
        testHistory.slice(0, 10).length
          ? testHistory
              .slice(0, 10)
              .map(
                (t) => `<tr>
                  <td>${new Date(t.timestamp).toLocaleDateString()}</td>
                  <td>${t.subjectName}</td>
                  <td style="text-transform: capitalize;">${t.mode}</td>
                  <td>${t.score} / ${t.total}</td>
                  <td><b>${t.percentage ?? Math.round((t.score / t.total) * 100)}%</b></td>
                </tr>`
              )
              .join('')
          : '<tr><td colspan="5" style="text-align:center;color:#9CA3AF;">No assessments recorded.</td></tr>'
      }
    </tbody>
  </table>

  <div class="footer">
    This official transcript is generated directly from evaluated test sessions. Valid without physical signature.
  </div>
</body>
</html>`;
  };

  const handlePrint = async () => {
    try {
      const html = generateReportHtml();
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        const printWindow = window.open('', '_blank', 'width=900,height=800');
        if (printWindow) {
          printWindow.document.open();
          printWindow.document.write(html);
          printWindow.document.close();
          printWindow.focus();
          setTimeout(() => {
            try {
              printWindow.print();
            } catch (e) {
              console.warn(e);
            }
          }, 500);
          return;
        }
      }
      await Print.printAsync({ html });
    } catch (e) {
      console.error('Print report card failed:', e);
      Alert.alert('Print Error', 'Could not print report card. Please try again.');
    }
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* ── HEADER BAR ── */}
      <View style={styles.headerBar}>
        <Pressable
          style={styles.backBtn}
          onPress={() => router.back()}
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={20} color="#3D2D27" />
        </Pressable>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>Academic Report Card</Text>
          <Text style={styles.headerSub}>Official Performance Transcript</Text>
        </View>
        <Pressable
          style={styles.printBtn}
          onPress={handlePrint}
          accessibilityLabel="Print or save as PDF"
        >
          <Ionicons name="print-outline" size={17} color="#FFF" />
          <Text style={styles.printBtnText}>Export PDF</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, isWide && styles.contentWide]}
        showsVerticalScrollIndicator={false}
      >
        {/* Student Profile Identity Card */}
        <View style={styles.studentIdCard}>
          <View style={styles.avatarWrap}>
            <Text style={styles.avatarLetter}>
              {(studentName || 'Student').charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.studentDetails}>
            <Text style={styles.studentNameText}>{studentName || 'Student Learner'}</Text>
            <Text style={styles.studentSubText}>
              {standardName || 'Standard'} · {boardName || 'Board'}
            </Text>
            {studentEmail ? <Text style={styles.studentEmailText}>{studentEmail}</Text> : null}
          </View>
          <View style={styles.activePill}>
            <View style={styles.activeDot} />
            <Text style={styles.activePillText}>ENROLLED</Text>
          </View>
        </View>

        {/* Big Performance Highlights */}
        <View style={styles.metricsGrid}>
          <View style={styles.metricCard}>
            <Text style={[styles.metricMainVal, { color: stats.gradeColor }]}>
              {stats.letterGrade}
            </Text>
            <Text style={styles.metricLabel}>Letter Grade</Text>
            <Text style={styles.metricSub}>GPA {stats.gpa}</Text>
          </View>

          <View style={styles.metricCard}>
            <Text style={[styles.metricMainVal, { color: '#C85C3E' }]}>
              {stats.overallPct}%
            </Text>
            <Text style={styles.metricLabel}>Accuracy Rate</Text>
            <Text style={styles.metricSub}>{stats.totalScore} of {stats.totalQs} Marks</Text>
          </View>

          <View style={styles.metricCard}>
            <Text style={[styles.metricMainVal, { color: '#7653A4' }]}>
              {stats.totalTests}
            </Text>
            <Text style={styles.metricLabel}>Assessments</Text>
            <Text style={styles.metricSub}>Tests evaluated</Text>
          </View>
        </View>

        {/* Mistake Bank & Weak Area Action Card */}
        <View style={styles.mistakeBanner}>
          <View style={styles.mistakeBannerLeft}>
            <View style={styles.mistakeIconWrap}>
              <Ionicons name="flash" size={20} color="#C85C3E" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.mistakeTitle}>
                Mistake Bank ({mistakeQuestions.length} Questions)
              </Text>
              <Text style={styles.mistakeSub}>
                {mistakeQuestions.length > 0
                  ? 'Target questions you missed or skipped to turn weaknesses into mastery.'
                  : 'Zero mistakes logged right now. Keep up the high standard!'}
              </Text>
            </View>
          </View>
          {mistakeQuestions.length > 0 && (
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
              <Pressable style={[styles.mistakeDrillBtn, { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#DFD1C3' }]} onPress={() => router.push('/mistakes' as any)}>
                <Ionicons name="book-outline" size={14} color="#C85C3E" />
                <Text style={[styles.mistakeDrillBtnText, { color: '#C85C3E' }]}>Mistake Notebook</Text>
              </Pressable>
              <Pressable style={styles.mistakeDrillBtn} onPress={startMistakeDrill}>
                <Text style={styles.mistakeDrillBtnText}>Drill Weak Areas</Text>
                <Ionicons name="arrow-forward" size={14} color="#FFF" />
              </Pressable>
            </View>
          )}
        </View>

        {/* Subject Mastery Breakdown */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Ionicons name="bar-chart" size={18} color="#C85C3E" />
            <Text style={styles.sectionTitle}>Subject Mastery & Progress</Text>
          </View>

          {stats.subjectList.length > 0 ? (
            <View style={styles.subjectList}>
              {stats.subjectList.map((subject) => (
                <View key={subject.name} style={styles.subjectItem}>
                  <View style={styles.subjectItemHead}>
                    <Text style={styles.subjectItemName}>{subject.name}</Text>
                    <Text style={styles.subjectItemPct}>{subject.pct}%</Text>
                  </View>

                  {/* Progress Bar */}
                  <View style={styles.progressBarTrack}>
                    <View
                      style={[
                        styles.progressBarFill,
                        {
                          width: `${Math.min(100, Math.max(5, subject.pct))}%`,
                          backgroundColor:
                            subject.pct >= 85
                              ? '#10B981'
                              : subject.pct >= 65
                              ? '#3B82F6'
                              : '#F59E0B',
                        },
                      ]}
                    />
                  </View>

                  <View style={styles.subjectItemMeta}>
                    <Text style={styles.subjectItemSub}>
                      {subject.testsCount} tests · {subject.score}/{subject.totalQs} marks
                    </Text>
                    <Text
                      style={[
                        styles.masteryPill,
                        subject.pct >= 85
                          ? styles.masteryPillHigh
                          : subject.pct >= 65
                          ? styles.masteryPillMid
                          : styles.masteryPillLow,
                      ]}
                    >
                      {subject.pct >= 85
                        ? 'Mastered'
                        : subject.pct >= 65
                        ? 'Proficient'
                        : 'Review Needed'}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.emptySubjectBox}>
              <Text style={styles.emptySubjectText}>
                No test results recorded yet. Complete quiz assessments to see your subject breakdown!
              </Text>
            </View>
          )}
        </View>

        {/* Assessment Log Table */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Ionicons name="time" size={18} color="#C85C3E" />
            <Text style={styles.sectionTitle}>Assessment History Log</Text>
          </View>

          {testHistory.length > 0 ? (
            <View style={styles.historyTable}>
              {testHistory.slice(0, 8).map((test, index) => {
                const pct = test.percentage ?? Math.round((test.score / test.total) * 100);
                return (
                  <View key={`hist-${test.timestamp}-${index}`} style={styles.historyRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.historySubjectText}>{test.subjectName}</Text>
                      <Text style={styles.historyDateText}>
                        {new Date(test.timestamp).toLocaleDateString()} · {test.mode}
                      </Text>
                    </View>
                    <View style={styles.historyScoreBox}>
                      <Text style={styles.historyScoreText}>
                        {test.score}/{test.total}
                      </Text>
                      <Text
                        style={[
                          styles.historyPctBadge,
                          pct >= 80 ? styles.pctHigh : pct >= 60 ? styles.pctMid : styles.pctLow,
                        ]}
                      >
                        {pct}%
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          ) : (
            <Text style={styles.emptyHistoryText}>No assessment history available yet.</Text>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F8F4EE' },

  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 12,
    backgroundColor: '#FFFDF9',
    borderBottomWidth: 1,
    borderBottomColor: '#EBE2D8',
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#F3ECE2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerInfo: { flex: 1, marginLeft: 12 },
  headerTitle: { fontSize: 16, fontWeight: '800', color: '#3D2D27' },
  headerSub: { fontSize: 11, color: '#8B786D', marginTop: 1 },
  printBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 11,
    backgroundColor: '#C85C3E',
  },
  printBtnText: { color: '#FFF', fontSize: 12, fontWeight: '800' },

  content: { padding: 16, paddingBottom: 40, gap: 16 },
  contentWide: { maxWidth: 960, width: '100%', alignSelf: 'center', paddingHorizontal: 24 },

  studentIdCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 18,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E8DDD2',
    backgroundColor: '#FFFFFF',
  },
  avatarWrap: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#C85C3E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: { color: '#FFF', fontSize: 20, fontWeight: '900' },
  studentDetails: { flex: 1 },
  studentNameText: { fontSize: 16, fontWeight: '800', color: '#1F1B18' },
  studentSubText: { fontSize: 12, color: '#76645B', marginTop: 2, fontWeight: '600' },
  studentEmailText: { fontSize: 11, color: '#A8988C', marginTop: 1 },
  activePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#ECFDF5',
  },
  activeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#10B981' },
  activePillText: { fontSize: 10, fontWeight: '800', color: '#065F46' },

  /* Metrics Grid */
  metricsGrid: { flexDirection: 'row', gap: 10 },
  metricCard: {
    flex: 1,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E8DDD2',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
  },
  metricMainVal: { fontSize: 26, fontWeight: '900' },
  metricLabel: { fontSize: 11, fontWeight: '800', color: '#3D2D27', marginTop: 4 },
  metricSub: { fontSize: 10, color: '#8B786D', marginTop: 2 },

  /* Mistake Banner */
  mistakeBanner: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F2DDD3',
    backgroundColor: '#FFF7F2',
    gap: 12,
  },
  mistakeBannerLeft: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  mistakeIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#FBE8DF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mistakeTitle: { fontSize: 14, fontWeight: '800', color: '#3D2D27' },
  mistakeSub: { fontSize: 12, color: '#76645B', marginTop: 3, lineHeight: 17 },
  mistakeDrillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 11,
    backgroundColor: '#C85C3E',
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
  },
  mistakeDrillBtnText: { color: '#FFF', fontSize: 12, fontWeight: '800' },

  /* Section Cards */
  sectionCard: {
    padding: 18,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E8DDD2',
    backgroundColor: '#FFFFFF',
  },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  sectionTitle: { fontSize: 14, fontWeight: '800', color: '#3D2D27' },

  subjectList: { gap: 14 },
  subjectItem: { gap: 6 },
  subjectItemHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  subjectItemName: { fontSize: 13, fontWeight: '700', color: '#1F1B18' },
  subjectItemPct: { fontSize: 13, fontWeight: '800', color: '#C85C3E' },
  progressBarTrack: { height: 8, borderRadius: 4, backgroundColor: '#EFE7DE', overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: 4 },
  subjectItemMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 },
  subjectItemSub: { fontSize: 11, color: '#8B786D' },
  masteryPill: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6, fontSize: 10, fontWeight: '800' },
  masteryPillHigh: { backgroundColor: '#ECFDF5', color: '#065F46' },
  masteryPillMid: { backgroundColor: '#EFF6FF', color: '#1E40AF' },
  masteryPillLow: { backgroundColor: '#FEF3C7', color: '#92400E' },

  emptySubjectBox: { paddingVertical: 20, alignItems: 'center' },
  emptySubjectText: { fontSize: 12, color: '#8B786D', textAlign: 'center', lineHeight: 18 },

  historyTable: { gap: 10 },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3ECE4',
  },
  historySubjectText: { fontSize: 13, fontWeight: '700', color: '#1F1B18' },
  historyDateText: { fontSize: 11, color: '#8B786D', marginTop: 2 },
  historyScoreBox: { alignItems: 'flex-end', gap: 3 },
  historyScoreText: { fontSize: 12, fontWeight: '700', color: '#3D2D27' },
  historyPctBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
    fontSize: 10,
    fontWeight: '800',
  },
  pctHigh: { backgroundColor: '#ECFDF5', color: '#065F46' },
  pctMid: { backgroundColor: '#EFF6FF', color: '#1E40AF' },
  pctLow: { backgroundColor: '#FEE2E2', color: '#991B1B' },
  emptyHistoryText: { fontSize: 12, color: '#8B786D', textAlign: 'center', paddingVertical: 14 },
});
