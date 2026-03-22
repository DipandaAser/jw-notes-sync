import { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  TextInput,
  useColorScheme,
} from 'react-native'
import { useRouter } from 'expo-router'
import {
  ArrowLeft,
  Search,
  ChevronDown,
  ChevronRight,
} from 'lucide-react-native'
import { useTranslation } from 'react-i18next'
import { useAppStore } from '../../src/stores/app'
import { getColors } from '../../src/theme'
import type { Location, Note, UserMark, BlockRange, Bookmark, Tag, TagMap } from '@jw-notes-sync/core'

type ExplorerTab = 'stats' | 'notes' | 'highlights' | 'bookmarks' | 'tags'

export default function ExplorerScreen() {
  const router = useRouter()
  const { t, i18n } = useTranslation()
  const colorScheme = useColorScheme()
  const isDark = colorScheme === 'dark'
  const colors = getColors(isDark)

  const data = useAppStore((s) => s.explorerData)
  const label = useAppStore((s) => s.explorerLabel)
  const closeExplorer = useAppStore((s) => s.closeExplorer)

  const [activeTab, setActiveTab] = useState<ExplorerTab>('stats')
  const [searchQuery, setSearchQuery] = useState('')

  if (!data) {
    return (
      <View style={[styles.container, { backgroundColor: colors.bg }]}>
        <Text style={{ color: colors.textMuted }}>No data</Text>
      </View>
    )
  }

  const locationMap = new Map<number, Location>()
  for (const loc of data.locations) locationMap.set(loc.LocationId, loc)

  function getLocLabel(locId: number | null): string {
    if (locId == null) return t('explorer.group.unknown')
    const loc = locationMap.get(locId)
    return loc?.Title ?? loc?.KeySymbol ?? t('explorer.group.unknown')
  }

  function handleBack() {
    closeExplorer()
    router.back()
  }

  const tabs: { id: ExplorerTab; label: string }[] = [
    { id: 'stats', label: t('explorer.tab.stats') },
    { id: 'notes', label: t('explorer.tab.notes') },
    { id: 'highlights', label: t('explorer.tab.highlights') },
    { id: 'bookmarks', label: t('explorer.tab.bookmarks') },
    { id: 'tags', label: t('explorer.tab.tags') },
  ]

  // Filter notes by search
  const filteredNotes = searchQuery.trim()
    ? data.notes.filter(
        (n) =>
          (n.Title?.toLowerCase().includes(searchQuery.toLowerCase())) ||
          (n.Content?.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : data.notes

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={handleBack} style={[styles.backBtn, { backgroundColor: colors.card }]}>
          <ArrowLeft size={18} color={colors.textMuted} />
        </Pressable>
        <View style={styles.headerText}>
          <Text style={[styles.title, { color: colors.text }]}>{t('explorer.title')}</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>{label}</Text>
        </View>
      </View>

      {/* Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsRow} contentContainerStyle={styles.tabsContent}>
        {tabs.map((tab) => (
          <Pressable
            key={tab.id}
            style={[styles.tab, { backgroundColor: activeTab === tab.id ? colors.primary : colors.card }]}
            onPress={() => setActiveTab(tab.id)}
          >
            <Text style={[styles.tabText, { color: activeTab === tab.id ? '#fff' : colors.textMuted }]}>
              {tab.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentInner}>
        {activeTab === 'stats' && (
          <StatsView data={data} colors={colors} t={t} />
        )}
        {activeTab === 'notes' && (
          <>
            <View style={[styles.searchBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Search size={16} color={colors.textMuted} />
              <TextInput
                style={[styles.searchInput, { color: colors.text }]}
                placeholder={t('explorer.notes.search')}
                placeholderTextColor={colors.textMuted}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>
            <NotesView notes={filteredNotes} getLocLabel={getLocLabel} colors={colors} t={t} lang={i18n.language} />
          </>
        )}
        {activeTab === 'highlights' && (
          <HighlightsView marks={data.userMarks} blockRanges={data.blockRanges} getLocLabel={getLocLabel} colors={colors} t={t} />
        )}
        {activeTab === 'bookmarks' && (
          <BookmarksView bookmarks={data.bookmarks} getLocLabel={getLocLabel} colors={colors} t={t} />
        )}
        {activeTab === 'tags' && (
          <TagsView tags={data.tags} tagMaps={data.tagMaps} notes={data.notes} colors={colors} t={t} />
        )}
      </ScrollView>
    </View>
  )
}

// ── Sub-views ──

function StatsView({ data, colors, t }: { data: any; colors: any; t: any }) {
  const stats = [
    { value: data.notes.length, label: t('stats.notes'), color: colors.accent1 },
    { value: data.userMarks.length, label: t('stats.highlights'), color: colors.accent2 },
    { value: data.bookmarks.length, label: t('stats.bookmarks'), color: colors.accent3 },
    { value: data.tags.length, label: t('stats.tags'), color: colors.accent4 },
    { value: data.locations.length, label: t('stats.locations'), color: colors.accent5 },
    { value: data.playlistItems.length, label: t('explorer.stats.playlists'), color: colors.accent6 },
  ]
  return (
    <View style={styles.statsGrid}>
      {stats.map((s) => (
        <View key={s.label} style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>{s.label}</Text>
        </View>
      ))}
    </View>
  )
}

function NotesView({ notes, getLocLabel, colors, t, lang }: { notes: Note[]; getLocLabel: (id: number | null) => string; colors: any; t: any; lang: string }) {
  if (notes.length === 0) {
    return <Text style={[styles.emptyText, { color: colors.textMuted }]}>{t('explorer.notes.empty')}</Text>
  }
  return (
    <View style={styles.listGap}>
      {notes.slice(0, 50).map((note) => (
        <View key={note.NoteId} style={[styles.listCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.groupLabel, { color: colors.textMuted }]}>{getLocLabel(note.LocationId)}</Text>
          {note.Title ? <Text style={[styles.noteTitle, { color: colors.text }]}>{note.Title}</Text> : null}
          <Text style={[styles.noteContent, { color: colors.textMuted }]} numberOfLines={3}>
            {note.Content || t('explorer.notes.noContent')}
          </Text>
          <Text style={[styles.noteDate, { color: colors.textMuted }]}>
            {new Date(note.LastModified).toLocaleDateString(lang, { day: 'numeric', month: 'short', year: 'numeric' })}
          </Text>
        </View>
      ))}
    </View>
  )
}

const HIGHLIGHT_COLORS: Record<number, { bg: string; fg: string }> = {
  1: { bg: '#fef08a', fg: '#854d0e' },
  2: { bg: '#bbf7d0', fg: '#166534' },
  3: { bg: '#bfdbfe', fg: '#1e40af' },
  4: { bg: '#fecdd3', fg: '#9f1239' },
  5: { bg: '#e9d5ff', fg: '#6b21a8' },
}

function HighlightsView({ marks, blockRanges, getLocLabel, colors, t }: { marks: UserMark[]; blockRanges: BlockRange[]; getLocLabel: (id: number) => string; colors: any; t: any }) {
  if (marks.length === 0) {
    return <Text style={[styles.emptyText, { color: colors.textMuted }]}>{t('explorer.highlights.empty')}</Text>
  }
  const rangesByMark = new Map<number, BlockRange[]>()
  for (const br of blockRanges) {
    const arr = rangesByMark.get(br.UserMarkId) ?? []
    arr.push(br)
    rangesByMark.set(br.UserMarkId, arr)
  }
  return (
    <View style={styles.listGap}>
      {marks.slice(0, 50).map((mark) => {
        const hc = HIGHLIGHT_COLORS[mark.ColorIndex] ?? HIGHLIGHT_COLORS[1]!
        const ranges = rangesByMark.get(mark.UserMarkId) ?? []
        return (
          <View key={mark.UserMarkId} style={[styles.listCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.highlightRow}>
              <View style={[styles.colorDot, { backgroundColor: hc.bg, borderColor: hc.fg }]} />
              <Text style={[styles.highlightLoc, { color: colors.text }]}>{getLocLabel(mark.LocationId)}</Text>
            </View>
            {ranges.length > 0 && (
              <View style={styles.rangesRow}>
                {ranges.map((br) => (
                  <Text key={br.BlockRangeId} style={[styles.rangeBadge, { backgroundColor: hc.bg + '60', color: hc.fg }]}>
                    {t('explorer.highlights.paragraph', { id: br.Identifier })}
                  </Text>
                ))}
              </View>
            )}
          </View>
        )
      })}
    </View>
  )
}

function BookmarksView({ bookmarks, getLocLabel, colors, t }: { bookmarks: Bookmark[]; getLocLabel: (id: number) => string; colors: any; t: any }) {
  if (bookmarks.length === 0) {
    return <Text style={[styles.emptyText, { color: colors.textMuted }]}>{t('explorer.bookmarks.empty')}</Text>
  }
  return (
    <View style={styles.listGap}>
      {bookmarks.map((bm) => (
        <View key={bm.BookmarkId} style={[styles.listCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.noteTitle, { color: colors.text }]}>{bm.Title}</Text>
          {bm.Snippet ? <Text style={[styles.noteContent, { color: colors.textMuted }]} numberOfLines={2}>{bm.Snippet}</Text> : null}
          <Text style={[styles.groupLabel, { color: colors.textMuted }]}>{getLocLabel(bm.PublicationLocationId)}</Text>
        </View>
      ))}
    </View>
  )
}

function TagsView({ tags, tagMaps, notes, colors, t }: { tags: Tag[]; tagMaps: TagMap[]; notes: Note[]; colors: any; t: any }) {
  const [expanded, setExpanded] = useState<Set<number>>(new Set())
  if (tags.length === 0) {
    return <Text style={[styles.emptyText, { color: colors.textMuted }]}>{t('explorer.tags.empty')}</Text>
  }

  const noteMap = new Map<number, Note>()
  for (const n of notes) noteMap.set(n.NoteId, n)

  const countByTag = new Map<number, number>()
  for (const tm of tagMaps) countByTag.set(tm.TagId, (countByTag.get(tm.TagId) ?? 0) + 1)

  const sorted = [...tags].sort((a, b) => a.Name.localeCompare(b.Name))

  function toggle(id: number) {
    const next = new Set(expanded)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setExpanded(next)
  }

  return (
    <View style={styles.listGap}>
      {sorted.map((tag) => (
        <View key={tag.TagId}>
          <Pressable
            style={[styles.tagRow, { backgroundColor: expanded.has(tag.TagId) ? colors.card : 'transparent' }]}
            onPress={() => toggle(tag.TagId)}
          >
            {expanded.has(tag.TagId) ? (
              <ChevronDown size={16} color={colors.textMuted} />
            ) : (
              <ChevronRight size={16} color={colors.textMuted} />
            )}
            <Text style={[styles.tagName, { color: colors.text }]}>{tag.Name}</Text>
            <Text style={[styles.tagCount, { color: colors.textMuted }]}>
              {t('explorer.tags.items', { count: countByTag.get(tag.TagId) ?? 0 })}
            </Text>
          </Pressable>
          {expanded.has(tag.TagId) && (
            <View style={styles.tagItems}>
              {tagMaps
                .filter((tm) => tm.TagId === tag.TagId)
                .map((tm) => {
                  const note = tm.NoteId != null ? noteMap.get(tm.NoteId) : null
                  return (
                    <Text key={tm.TagMapId} style={[styles.tagItem, { color: colors.textMuted, backgroundColor: colors.card }]}>
                      {note ? (note.Title ?? note.Content?.slice(0, 60) ?? `Note #${tm.NoteId}`) : tm.LocationId != null ? `Location #${tm.LocationId}` : `Item #${tm.TagMapId}`}
                    </Text>
                  )
                })}
            </View>
          )}
        </View>
      ))}
    </View>
  )
}

// ── Styles ──

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, paddingBottom: 8 },
  backBtn: { width: 36, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  headerText: { flex: 1 },
  title: { fontSize: 20, fontWeight: '700' },
  subtitle: { fontSize: 13 },
  tabsRow: { maxHeight: 48, paddingHorizontal: 16 },
  tabsContent: { gap: 8, alignItems: 'center', paddingRight: 16 },
  tab: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  tabText: { fontSize: 13, fontWeight: '600' },
  content: { flex: 1 },
  contentInner: { padding: 16 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  statCard: { width: '47%', borderRadius: 12, borderWidth: 1, padding: 16, alignItems: 'center' },
  statValue: { fontSize: 28, fontWeight: '700' },
  statLabel: { fontSize: 12, marginTop: 4 },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 16 },
  searchInput: { flex: 1, fontSize: 14, padding: 0 },
  listGap: { gap: 8 },
  listCard: { borderRadius: 10, borderWidth: 1, padding: 12 },
  groupLabel: { fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  noteTitle: { fontSize: 14, fontWeight: '600', marginBottom: 4 },
  noteContent: { fontSize: 13, lineHeight: 18 },
  noteDate: { fontSize: 11, marginTop: 6 },
  emptyText: { fontSize: 14, textAlign: 'center', paddingVertical: 40 },
  highlightRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  colorDot: { width: 12, height: 12, borderRadius: 6, borderWidth: 2 },
  highlightLoc: { fontSize: 14, fontWeight: '500', flex: 1 },
  rangesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  rangeBadge: { fontSize: 11, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, overflow: 'hidden' },
  tagRow: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 8 },
  tagName: { flex: 1, fontSize: 14, fontWeight: '500' },
  tagCount: { fontSize: 12 },
  tagItems: { marginLeft: 36, gap: 4, marginBottom: 8 },
  tagItem: { fontSize: 12, padding: 8, borderRadius: 6, overflow: 'hidden' },
})
