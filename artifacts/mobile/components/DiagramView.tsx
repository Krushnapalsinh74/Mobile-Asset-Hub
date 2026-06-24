import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface DiagramViewProps {
  textDiagram?: string | null;
  diagram?: {
    type?: 'tikz' | 'image' | 'url';
    content?: string;
    url?: string;
  } | null;
  diagramId?: string | null;
}

/**
 * Renders a question diagram.
 * Supports:
 *  - textDiagram: ASCII / text diagram shown in a monospace block
 *  - diagram.url: image shown via <img> (web) or Image (native)
 *  - diagram.content with type=tikz: TikZ code rendered via TikZJax (web only)
 */
export default function DiagramView({ textDiagram, diagram }: DiagramViewProps) {
  const hasDiagram = !!textDiagram || !!diagram?.url || !!diagram?.content;
  if (!hasDiagram) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.dot} />
        <Ionicons name="image-outline" size={12} color="#6366F1" style={{ marginRight: 2 }} />
        <Text style={styles.label}>Diagram</Text>
      </View>

      {/* TikZ diagram via TikZJax (web only) */}
      {Platform.OS === 'web' && diagram?.type === 'tikz' && diagram.content && (
        <TikzDiagram code={diagram.content} />
      )}

      {/* Image from URL */}
      {diagram?.url && Platform.OS === 'web' && (
        <img
          src={diagram.url}
          alt="Question diagram"
          style={{ maxWidth: '100%', borderRadius: 8, marginTop: 8 }}
        />
      )}

      {/* ASCII / text diagram */}
      {textDiagram && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <Text style={styles.monoText}>{textDiagram}</Text>
        </ScrollView>
      )}
    </View>
  );
}

// ── TikZJax iframe (web only) ─────────────────────────────────────────────
function TikzDiagram({ code }: { code: string }) {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return null;

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <link rel="stylesheet" type="text/css" href="https://tikzjax.com/v1/fonts.css">
  <script src="https://tikzjax.com/v1/tikzjax.js"></script>
  <style>
    body { margin: 0; padding: 8px; background: transparent; display: flex; justify-content: center; }
    svg { max-width: 100%; }
  </style>
</head>
<body>
  <script type="text/tikz">${code}</script>
</body>
</html>`;

  const blob = new Blob([html], { type: 'text/html' });
  const src = URL.createObjectURL(blob);

  return (
    <iframe
      src={src}
      style={{
        width: '100%',
        height: 260,
        border: 'none',
        borderRadius: 8,
        background: 'transparent',
        marginTop: 8,
      } as any}
      sandbox="allow-scripts"
      title="TikZ diagram"
    />
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E0E7FF',
    backgroundColor: '#F5F7FF',
    padding: 12,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 8,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#6366F1',
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6366F1',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  monoText: {
    fontFamily: Platform.OS === 'web' ? 'monospace' : 'Courier',
    fontSize: 12,
    color: '#374151',
    lineHeight: 18,
    letterSpacing: 0.3,
  },
});
