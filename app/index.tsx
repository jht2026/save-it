import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import {
  Alert, KeyboardAvoidingView, Linking,
  ScrollView, StyleSheet,
  Text, TextInput, TouchableOpacity, View
} from 'react-native';

const CATS: Record<string, { label: string; badge: string; subs: string[] }> = {
  mad:   { label: 'Mad',   badge: '#EBF2ED', subs: ['Morgenmad','Frokost','Aftensmad','Salat','Kage og snacks','Drinks'] },
  tøj:   { label: 'Tøj',   badge: '#F7EDED', subs: ['Overdele','Underdele','Kjoler/jumpsuits','Jakker','Sko','Accessories'] },
  bolig: { label: 'Bolig', badge: '#F5F0E8', subs: ['Stue','Soveværelse','Køkken','Badeværelse','Børneværelse','Udendørs','Opbevaring'] },
  andet: { label: 'Andet', badge: '#EFECF7', subs: ['Diverse'] },
};

const CAT_ICONS: Record<string, { name: string; color: string; activeBg: string }> = {
  mad:   { name: 'silverware-fork-knife', color: '#4A7C59', activeBg: '#EBF2ED' },
  tøj:   { name: 'hanger',               color: '#C2675A', activeBg: '#F7EDED' },
  bolig: { name: 'sofa-outline',          color: '#8B6F3E', activeBg: '#F5F0E8' },
  andet: { name: 'bookmark-outline',      color: '#7B6FA8', activeBg: '#EFECF7' },
};

type Link = { id: string; url: string; title: string; cat: string; sub: string; note: string; date: string; };

export default function Index() {
  const [links, setLinks] = useState<Link[]>([]);
  const [activeCat, setActiveCat] = useState('alle');
  const [activeSub, setActiveSub] = useState('alle');
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [fetchStatus, setFetchStatus] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editNote, setEditNote] = useState('');
  const [editCat, setEditCat] = useState('mad');
  const [editSub, setEditSub] = useState('Morgenmad');
  const [search, setSearch] = useState('');
  const [cats, setCats] = useState(CATS);

  useEffect(() => {
    AsyncStorage.getItem('links').then(v => { if (v) setLinks(JSON.parse(v)); });
    AsyncStorage.getItem('cats').then(v => { if (v) setCats(JSON.parse(v)); });
  }, []);

  const saveLinks = (l: Link[]) => {
    setLinks(l);
    AsyncStorage.setItem('links', JSON.stringify(l));
  };

  const saveCats = (c: typeof CATS) => {
    setCats(c);
    AsyncStorage.setItem('cats', JSON.stringify(c));
  };

  const fetchTitle = async (rawUrl: string) => {
    setFetchStatus('Henter...');
    setTitle('');
    try {
      const res = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(rawUrl)}`);
      const d = await res.json();
      const m = d.contents?.match(/<title[^>]*>([^<]+)<\/title>/i);
      const t = m ? m[1].trim().replace(/\s+/g, ' ').slice(0, 90) : '';
      if (t) { setTitle(t); setFetchStatus('✓ Titel fundet'); }
      else throw new Error();
    } catch {
      const domain = (() => { try { return new URL(rawUrl).hostname.replace('www.', ''); } catch { return ''; } })();
      setTitle(domain);
      setFetchStatus('Skriv titel selv');
    }
  };

  const handleUrlChange = (val: string) => {
    setUrl(val);
    setFetchStatus('');
    if (val.length > 8) {
      const full = val.startsWith('http') ? val : 'https://' + val;
      fetchTitle(full);
    }
  };

  const handleAdd = () => {
    if (!url) return;
    const full = url.startsWith('http') ? url : 'https://' + url;
    const cat = activeCat === 'alle' ? 'andet' : activeCat;
    const sub = activeSub === 'alle' ? cats[cat].subs[0] : activeSub;
    const newLink: Link = {
      id: Date.now().toString(), url: full,
      title: title || full, cat, sub, note,
      date: new Date().toLocaleDateString('da-DK'),
    };
    saveLinks([newLink, ...links]);
    setUrl(''); setTitle(''); setNote(''); setFetchStatus('');
  };

  const handleDelete = (id: string) => {
    Alert.alert('Slet link', 'Er du sikker?', [
      { text: 'Annuller', style: 'cancel' },
      { text: 'Slet', style: 'destructive', onPress: () => saveLinks(links.filter(l => l.id !== id)) },
    ]);
  };

  const startEdit = (l: Link) => {
    setEditingId(l.id); setEditTitle(l.title);
    setEditNote(l.note); setEditCat(l.cat); setEditSub(l.sub);
  };

  const saveEdit = () => {
    saveLinks(links.map(l => l.id === editingId
      ? { ...l, title: editTitle, note: editNote, cat: editCat, sub: editSub }
      : l));
    setEditingId(null);
  };

  const filtered = links.filter(l =>
    (activeCat === 'alle' || l.cat === activeCat) &&
    (activeSub === 'alle' || l.sub === activeSub) &&
    (!search || l.title.toLowerCase().includes(search.toLowerCase()) ||
      l.url.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <KeyboardAvoidingView
  style={s.root}
  behavior="padding"
  keyboardVerticalOffset={100}
>
      <ScrollView contentContainerStyle={s.scrollContent} keyboardShouldPersistTaps="handled">

        <View style={s.header}>
          <Text style={s.wordmark}>save<Text style={s.dot}>.</Text>it</Text>
          <TextInput
            style={s.search}
            placeholder="Søg..."
            placeholderTextColor="#888"
            value={search}
            onChangeText={setSearch}
          />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.catScroll} contentContainerStyle={s.catRowContent}>
          {Object.entries(cats).map(([k, v]) => (
            <TouchableOpacity key={k}
              style={[s.catTile, activeCat === k && { backgroundColor: CAT_ICONS[k].activeBg }]}
              onPress={() => { setActiveCat(activeCat === k ? 'alle' : k); setActiveSub('alle'); }}>
              <MaterialCommunityIcons name={CAT_ICONS[k].name as any} size={24} color={CAT_ICONS[k].color} />
              <Text style={[s.catLabel, activeCat === k && { color: CAT_ICONS[k].color, fontWeight: '600' }]}>{v.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {activeCat !== 'alle' && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.subScroll} contentContainerStyle={s.subContent}>
            <TouchableOpacity style={[s.subPill, activeSub === 'alle' && s.subPillActive]} onPress={() => setActiveSub('alle')}>
              <Text style={[s.subPillText, activeSub === 'alle' && s.subPillTextActive]}>Alle</Text>
            </TouchableOpacity>
            {cats[activeCat].subs.map(sub => (
              <TouchableOpacity key={sub} style={[s.subPill, activeSub === sub && s.subPillActive]} onPress={() => setActiveSub(sub)}>
                <Text style={[s.subPillText, activeSub === sub && s.subPillTextActive]}>{sub}</Text>
              </TouchableOpacity>
            ))}
            <TextInput
              style={s.addSubInput}
              placeholder="+ Tilføj"
              placeholderTextColor={T.ink3}
              returnKeyType="done"
              onSubmitEditing={(e) => {
                const navn = e.nativeEvent.text.trim();
                if (!navn) return;
                const updated = { ...cats, [activeCat]: { ...cats[activeCat], subs: [...cats[activeCat].subs, navn] } };
                saveCats(updated);
              }}
            />
          </ScrollView>
        )}

        {filtered.length === 0
          ? <Text style={s.empty}>Ingen links endnu</Text>
          : filtered.map(l => (
            <View key={l.id} style={s.card}>
              {editingId === l.id ? (
                <View style={s.editBox}>
  <TextInput style={s.editInput} value={editTitle} onChangeText={setEditTitle} placeholder="Titel" placeholderTextColor="#888" />
  <TextInput style={s.editInput} value={editNote} onChangeText={setEditNote} placeholder="Note" placeholderTextColor="#888" />
  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingVertical: 4 }}>
    {Object.entries(cats).map(([k, v]) => (
      <TouchableOpacity key={k}
        style={[s.subPill, editCat === k && s.subPillActive]}
        onPress={() => { setEditCat(k); setEditSub(cats[k].subs[0]); }}>
        <Text style={[s.subPillText, editCat === k && s.subPillTextActive]}>{v.label}</Text>
      </TouchableOpacity>
    ))}
  </ScrollView>
  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingVertical: 4 }}>
    {cats[editCat]?.subs.map(sub => (
      <TouchableOpacity key={sub}
        style={[s.subPill, editSub === sub && s.subPillActive]}
        onPress={() => setEditSub(sub)}>
        <Text style={[s.subPillText, editSub === sub && s.subPillTextActive]}>{sub}</Text>
      </TouchableOpacity>
    ))}
  </ScrollView>
  <View style={s.editActions}>
                    <TouchableOpacity style={s.saveBtn} onPress={saveEdit}>
                      <Text style={s.saveBtnText}>Gem ændringer</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={s.cancelBtn} onPress={() => setEditingId(null)}>
                      <Text style={s.cancelBtnText}>Annuller</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <>
                  <View style={s.cardTop}>
                    <View style={{ flex: 1 }}>
                      <Text style={s.cardTitle} numberOfLines={2}>{l.title}</Text>
                      <Text style={s.cardDomain} numberOfLines={1}>{l.url.replace(/^https?:\/\/(www\.)?/, '').split('/')[0]}</Text>
                    </View>
                    <View style={s.cardActions}>
                      <TouchableOpacity onPress={() => startEdit(l)} style={s.iconBtn}>
                        <MaterialCommunityIcons name="pencil-outline" size={18} color={T.ink3} />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => Linking.openURL(l.url)} style={s.iconBtn}>
                        <MaterialCommunityIcons name="open-in-new" size={18} color={T.ink3} />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => handleDelete(l.id)} style={s.iconBtn}>
                        <MaterialCommunityIcons name="trash-can-outline" size={18} color={T.ink3} />
                      </TouchableOpacity>
                    </View>
                  </View>
                  {l.note ? <Text style={s.cardNote}>{l.note}</Text> : null}
                  <View style={s.cardBottom}>
                    <View style={[s.badge, { backgroundColor: cats[l.cat]?.badge || '#F1EFE8' }]}>
                      <Text style={s.badgeText}>{cats[l.cat]?.label} · {l.sub}</Text>
                    </View>
                    <Text style={s.cardDate}>{l.date}</Text>
                  </View>
                </>
              )}
            </View>
          ))
        }

        <View style={s.inputBox}>
          <View style={s.inputRow}>
            <TextInput
              style={[s.input, { flex: 1 }]}
              placeholder="Indsæt link..."
              value={url}
              onChangeText={handleUrlChange}
              autoCapitalize="none"
              keyboardType="url"
              placeholderTextColor="#888"
            />
            <TouchableOpacity style={s.gemBtn} onPress={handleAdd}>
              <Text style={s.gemBtnText}>Gem</Text>
            </TouchableOpacity>
          </View>
          <View style={s.inputRow}>
            <TextInput
              style={[s.input, { flex: 1 }]}
              placeholder={fetchStatus || 'Titel...'}
              value={title}
              onChangeText={setTitle}
              placeholderTextColor="#888"
            />
            <TextInput
              style={[s.input, { flex: 1 }]}
              placeholder="Note (valgfri)"
              value={note}
              onChangeText={setNote}
              placeholderTextColor="#888"
            />
          </View>
        </View>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const T = { cream: '#FAF8F4', ink: '#1C1917', ink2: '#57534E', ink3: '#A8A29E', sand: '#D4C5A9', border: '#E7E2D8', sage: '#4A7C59' };

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.cream },
  scrollContent: { paddingBottom: 40 },
  header: { paddingHorizontal: 20, paddingTop: 56, paddingBottom: 12 },
  wordmark: { fontFamily: 'serif', fontSize: 26, color: T.ink, marginBottom: 10 },
  dot: { color: '#4A7C59' },
  search: { height: 36, backgroundColor: '#fff', borderRadius: 10, paddingHorizontal: 14, fontSize: 14, color: T.ink },
  catScroll: { maxHeight: 80 },
  catRowContent: { paddingHorizontal: 16, gap: 8, alignItems: 'center', paddingVertical: 8, flex: 1 },
  catTile: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 12, backgroundColor: '#fff' },
  catLabel: { fontSize: 11, fontWeight: '500', color: T.ink3, marginTop: 3 },
  subScroll: { maxHeight: 44 },
  subContent: { paddingHorizontal: 16, gap: 6, alignItems: 'center' },
  subPill: { height: 26, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1, borderColor: T.border, justifyContent: 'center' },
  subPillActive: { backgroundColor: T.ink, borderColor: T.ink },
  subPillText: { fontSize: 11, color: T.ink2 },
  subPillTextActive: { color: '#fff', fontWeight: '500' },
  addSubInput: { height: 26, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1, borderColor: T.sand, fontSize: 11, color: T.ink3, minWidth: 80 },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 14, marginHorizontal: 12, marginBottom: 8 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  cardTitle: { fontSize: 14, fontWeight: '500', color: T.ink, lineHeight: 20 },
  cardDomain: { fontSize: 11, color: T.ink3, marginTop: 2 },
  cardNote: { fontSize: 13, color: T.ink2, marginTop: 6 },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  cardActions: { flexDirection: 'row', gap: 2 },
  iconBtn: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  badge: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 11, fontWeight: '500', color: T.ink2 },
  cardDate: { fontSize: 11, color: T.ink3 },
  editBox: { gap: 8 },
  editInput: { height: 34, borderWidth: 1, borderColor: T.border, borderRadius: 8, paddingHorizontal: 10, fontSize: 13, color: T.ink, backgroundColor: T.cream },
  editActions: { flexDirection: 'row', gap: 8 },
  saveBtn: { flex: 1, height: 32, backgroundColor: T.ink, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  saveBtnText: { color: '#fff', fontSize: 13, fontWeight: '500' },
  cancelBtn: { height: 32, paddingHorizontal: 14, borderWidth: 1, borderColor: T.border, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  cancelBtnText: { fontSize: 13, color: T.ink2 },
  empty: { textAlign: 'center', padding: 40, color: T.ink3, fontSize: 14 },
  inputBox: { borderTopWidth: 1, borderTopColor: T.border, padding: 16, paddingBottom: 32, gap: 8, backgroundColor: '#fff', marginTop: 16 },
  inputRow: { flexDirection: 'row', gap: 8 },
  input: { height: 42, borderWidth: 1, borderColor: T.sand, borderRadius: 10, paddingHorizontal: 12, fontSize: 15, backgroundColor: '#fff', color: T.ink },
  gemBtn: { height: 42, paddingHorizontal: 18, backgroundColor: T.ink, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  gemBtnText: { color: '#fff', fontSize: 15, fontWeight: '500' },
});