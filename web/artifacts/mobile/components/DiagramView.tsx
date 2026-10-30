import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Image, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';

interface DiagramViewProps {
  textDiagram?: string | null;
  diagram?: {
    type?: string;
    content?: string;
    url?: string;
  } | string | null;
  diagramId?: string | null;
}

/** Resolve diagram prop to a normalised object */
function resolveDiagram(d: DiagramViewProps['diagram']): { type?: string; content?: string; url?: string } | null {
  if (!d) return null;
  if (typeof d === 'string') {
    if (d.startsWith('http') || d.startsWith('data:image')) return { type: 'image', url: d };
    return null;
  }
  return d;
}

/**
 * Renders a question diagram.
 *  - textDiagram  → monospace ASCII block (all platforms)
 *  - diagram.url  → image with tap-to-fullscreen on native
 *  - diagram.type=tikz → TikZJax (web: <iframe>, native: <WebView>)
 */
export default function DiagramView({ textDiagram, diagram }: DiagramViewProps) {
  const resolved = resolveDiagram(diagram);
  const imageUrl = resolved?.url ?? null;
  const hasDiagram = !!textDiagram || !!imageUrl || !!resolved?.content;
  const [fullscreen, setFullscreen] = useState(false);

  if (!hasDiagram) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.dot} />
        <Ionicons name="image-outline" size={12} color="#6366F1" style={{ marginRight: 2 }} />
        <Text style={styles.label}>Diagram</Text>
      </View>

      {/* TikZ diagram */}
      {resolved?.type === 'tikz' && resolved.content && (
        <TikzDiagram code={resolved.content} />
      )}

      {/* Image from URL */}
      {imageUrl && (
        Platform.OS === 'web' ? (
          <img
            src={imageUrl}
            alt="Question diagram"
            style={{ maxWidth: '100%', borderRadius: 8, marginTop: 8, cursor: 'zoom-in' } as any}
            onClick={() => window.open(imageUrl, '_blank')}
          />
        ) : (
          <>
            <Pressable onPress={() => setFullscreen(true)} style={styles.imagePressable}>
              <Image
                source={{ uri: imageUrl }}
                style={styles.image}
                resizeMode="contain"
              />
              <View style={styles.zoomHint}>
                <Ionicons name="expand-outline" size={12} color="#6366F1" />
                <Text style={styles.zoomHintText}>Tap to expand</Text>
              </View>
            </Pressable>

            {/* Fullscreen modal */}
            <Modal visible={fullscreen} transparent animationType="fade" onRequestClose={() => setFullscreen(false)}>
              <View style={styles.modalOverlay}>
                <Pressable style={styles.modalClose} onPress={() => setFullscreen(false)}>
                  <Ionicons name="close-circle" size={32} color="#fff" />
                </Pressable>
                <ScrollView
                  maximumZoomScale={4}
                  minimumZoomScale={1}
                  centerContent
                  style={{ flex: 1 }}
                  contentContainerStyle={styles.modalContent}
                >
                  <Image
                    source={{ uri: imageUrl }}
                    style={styles.modalImage}
                    resizeMode="contain"
                  />
                </ScrollView>
              </View>
            </Modal>
          </>
        )
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

// ── TikZJax renderer ──────────────────────────────────────────────────────
function TikzDiagram({ code }: { code: string }) {
  const html = `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <link rel="stylesheet" type="text/css" href="https://tikzjax.com/v1/fonts.css">
  <script src="https://tikzjax.com/v1/tikzjax.js"></script>
  <style>
    body{margin:0;padding:8px;background:transparent;display:flex;justify-content:center}
    svg{max-width:100%}
  </style>
</head>
<body>
  <script type="text/tikz">${code}</script>
</body>
</html>`;

  if (Platform.OS === 'web' && typeof document !== 'undefined') {
    const blob = new Blob([html], { type: 'text/html' });
    const src = URL.createObjectURL(blob);
    return (
      <iframe
        src={src}
        style={{ width: '100%', height: 260, border: 'none', borderRadius: 8, background: 'transparent', marginTop: 8 } as any}
        sandbox="allow-scripts"
        title="TikZ diagram"
      />
    );
  }

  return (
    <WebView
      source={{ html }}
      style={{ height: 260, borderRadius: 8, marginTop: 8 }}
      scrollEnabled={false}
      originWhitelist={['*']}
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
  imagePressable: {
    marginTop: 8,
  },
  image: {
    width: '100%',
    height: 220,
    borderRadius: 8,
  },
  zoomHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: 4,
  },
  zoomHintText: {
    fontSize: 11,
    color: '#6366F1',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
  },
  modalClose: {
    position: 'absolute',
    top: 48,
    right: 16,
    zIndex: 10,
  },
  modalContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalImage: {
    width: '100%',
    height: 500,
  },
  monoText: {
    fontFamily: Platform.OS === 'web' ? 'monospace' : 'Courier',
    fontSize: 12,
    color: '#374151',
    lineHeight: 18,
    letterSpacing: 0.3,
  },
});
