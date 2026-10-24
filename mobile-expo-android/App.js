import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  Image,
  Alert,
  TextInput,
  SafeAreaView,
  StatusBar,
  Linking,
  ScrollView,
  Share,
  Clipboard
} from 'react-native';
import io from 'socket.io-client';

// Cloudflare public tunnel URL & Local LAN fallback
const PUBLIC_TUNNEL = 'https://frontpage-vocal-morgan-cons.trycloudflare.com';
const LOCAL_LAN = 'http://10.54.179.36:5001';

// Drop-off points in Bengaluru
const BENGALURU_LOCATIONS = [
  { id: 'Apollo Pharmacy - Indiranagar 100ft Rd', address: '100ft Road, HAL 2nd Stage, Indiranagar, Bengaluru' },
  { id: 'Manipal Hospital - Old Airport Road', address: '98 HAL Old Airport Road, Kodihalli, Bengaluru' },
  { id: 'Victoria Hospital - City Market Hub', address: 'Fort Rd, near City Market, Kalasipalya, Bengaluru' },
  { id: 'Fortis Hospital - Bannerghatta Road', address: '154/9 Bannerghatta Main Rd, Opp IIMB, Bengaluru' },
  { id: 'MedPlus Pharmacy - Koramangala 5th Block', address: '17th Main Rd, KHB Colony, 5th Block, Koramangala, Bengaluru' },
  { id: 'Kempegowda Bus Station (Majestic) - Central Depot', address: 'Majestic Bus Stand, Gubbi Thotadappa Rd, Bengaluru' },
  { id: 'Bowring & Lady Curzon Hospital - Shivajinagar', address: 'Hospital Rd, Tasker Town, Shivajinagar, Bengaluru' },
  { id: 'Apollo Pharmacy - 4th Block Jayanagar', address: '11th Main Road, 4th Block, Jayanagar, Bengaluru' },
];

const PACKAGING_MATERIALS = [
  'PVC / PVDC Transparent + Aluminum Foil',
  'Alu-Alu (Cold-Formed High Barrier Opaque Foil)',
  'Aclar High-Moisture Pharma Blister',
  'Paper-Foil Peelable Child-Resistant Blister',
];

const STRIP_TIERS = [
  { label: '1 – 5 Strips', count: 4, discount: 10 },
  { label: '6 – 15 Strips', count: 10, discount: 15 },
  { label: '16 – 30 Strips', count: 20, discount: 20 },
  { label: '31+ Strips (Bulk)', count: 35, discount: 25 },
];

export default function App() {
  const [activeTab, setActiveTab] = useState('fleet'); // 'fleet' | 'deposit' | 'about'
  const [serverUrl, setServerUrl] = useState(PUBLIC_TUNNEL);
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [reports, setReports] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);
  const [showConfig, setShowConfig] = useState(false);

  // Citizen Deposit Form State
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedBin, setSelectedBin] = useState(BENGALURU_LOCATIONS[0].id);
  const [material, setMaterial] = useState(PACKAGING_MATERIALS[0]);
  const [selectedTier, setSelectedTier] = useState(STRIP_TIERS[1]);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [generatedVoucher, setGeneratedVoucher] = useState(null);

  // Connect to Socket.IO Server
  useEffect(() => {
    let s;
    try {
      s = io(serverUrl, {
        transports: ['websocket', 'polling'],
        reconnectionAttempts: 5,
        timeout: 10000
      });

      s.on('connect', () => {
        setConnected(true);
        fetch(`${serverUrl}/api/reports`)
          .then(res => res.json())
          .then(data => {
            if (Array.isArray(data)) setReports(data);
          })
          .catch(err => console.log('Fetch error:', err));
      });

      s.on('disconnect', () => {
        setConnected(false);
      });

      s.on('connect_error', () => {
        setConnected(false);
      });

      // Real-time Push Alert when a new blister is deposited on web or mobile
      s.on('report:new', (newReport) => {
        setReports(prev => [newReport, ...prev]);
        Alert.alert(
          '🚨 NEW BLISTER RECOVERY ALERT!',
          `${newReport.stripCount || 'Blister strips'} deposited at:\n${newReport.binId}\nCitizen: ${newReport.userName || 'Citizen'}\nVoucher: ${newReport.promoCode || 'Generated'}`,
          [
            { text: 'Later' },
            { text: 'View Deposit', onPress: () => { setSelectedReport(newReport); setActiveTab('fleet'); } }
          ]
        );
      });

      s.on('report:status_changed', (update) => {
        setReports(prev =>
          prev.map(r => (r.token === update.token ? { ...r, ...update.report, status: update.status } : r))
        );
        if (selectedReport && selectedReport.token === update.token) {
          setSelectedReport(prev => ({ ...prev, ...update.report, status: update.status }));
        }
      });

      setSocket(s);
    } catch (err) {
      console.log('Socket init error:', err);
    }

    return () => {
      if (s) s.disconnect();
    };
  }, [serverUrl]);

  // Status transitions for blister recovery
  const updateStatus = async (token, newStatus) => {
    try {
      const res = await fetch(`${serverUrl}/api/reports/${encodeURIComponent(token)}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          driverName: 'Eco-Blisters Recovery Fleet (Bengaluru Unit #01)',
          note: `Status updated to ${newStatus} via Eco-Blisters Android App`
        })
      });
      const data = await res.json();
      if (data.report) {
        setSelectedReport(data.report);
      }
      Alert.alert('Status Updated', `Deposit status set to: ${newStatus}`);
    } catch (e) {
      Alert.alert('Error', 'Failed to update recovery status');
    }
  };

  // Turn-by-Turn GPS navigation
  const openNavigation = (lat, lng) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    Linking.openURL(url);
  };

  // Submit Blister Deposit from Citizen Tab
  const handleDepositSubmit = async () => {
    if (!fullName.trim()) {
      Alert.alert('Name Required', 'Please enter your Full Name to generate your discount voucher.');
      return;
    }

    const loc = BENGALURU_LOCATIONS.find(l => l.id === selectedBin) || BENGALURU_LOCATIONS[0];
    setSubmitting(true);

    try {
      const payload = {
        userName: fullName.trim(),
        userEmail: email.trim() || null,
        userPhone: phone.trim() || null,
        binId: loc.id,
        materialType: material,
        stripCount: selectedTier.label,
        exactStrips: selectedTier.count,
        latitude: 12.9716,
        longitude: 77.5946,
        address: loc.address,
        notes: notes.trim(),
        date: new Date().toISOString()
      };

      const res = await fetch(`${serverUrl}/api/reports`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error('Submission failed');
      const data = await res.json();

      setGeneratedVoucher({
        promoCode: data.promoCode || `ECOBLISTER-${selectedTier.discount}OFF-98B2`,
        discount: selectedTier.discount,
        userName: fullName.trim(),
        binId: loc.id,
        strips: selectedTier.label
      });

      Alert.alert(
        '🎉 Blister Deposited Successfully!',
        `Your ${selectedTier.discount}% pharmacy discount code is: ${data.promoCode || 'ECOBLISTER-VOUCHER'}`
      );
    } catch (err) {
      Alert.alert('Error', 'Failed to record deposit. Check server connection.');
    } finally {
      setSubmitting(false);
    }
  };

  const copyPromoCode = (code) => {
    if (Clipboard && Clipboard.setString) {
      Clipboard.setString(code);
      Alert.alert('Copied!', `Promo code "${code}" copied to clipboard.`);
    } else {
      Share.share({ message: `My Eco-Blisters Pharmacy Discount Voucher: ${code}` });
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#022c22" />

      {/* Top Brand Header */}
      <View style={styles.header}>
        <View style={styles.brandRow}>
          <View style={styles.logoBadge}>
            <Text style={styles.logoPill}>💊</Text>
          </View>
          <View>
            <Text style={styles.brandTitle}>Eco-Blisters</Text>
            <Text style={styles.tagline}>Collect • Track • Recover</Text>
          </View>
        </View>

        <View style={styles.headerActions}>
          <View style={[styles.statusBadge, { backgroundColor: connected ? '#064e3b' : '#78350f' }]}>
            <View style={[styles.statusDot, { backgroundColor: connected ? '#34d399' : '#fbbf24' }]} />
            <Text style={styles.statusBadgeText}>{connected ? 'Live Sync' : 'Connecting'}</Text>
          </View>

          <TouchableOpacity onPress={() => setShowConfig(!showConfig)} style={styles.configBtn}>
            <Text style={styles.configBtnText}>⚙️ URL</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Server URL Config Drawer */}
      {showConfig && (
        <View style={styles.configBox}>
          <Text style={styles.configLabel}>Target Backend URL:</Text>
          <TextInput
            style={styles.configInput}
            value={serverUrl}
            onChangeText={setServerUrl}
            placeholder="https://... or http://..."
            placeholderTextColor="#64748b"
          />
          <View style={styles.quickUrlRow}>
            <TouchableOpacity onPress={() => setServerUrl(PUBLIC_TUNNEL)} style={styles.quickUrlBtn}>
              <Text style={styles.quickUrlBtnText}>🌐 Cloudflare Tunnel</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setServerUrl(LOCAL_LAN)} style={styles.quickUrlBtn}>
              <Text style={styles.quickUrlBtnText}>🏠 Local LAN (WiFi)</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Modern Tab Selector */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          onPress={() => { setActiveTab('fleet'); setSelectedReport(null); }}
          style={[styles.tabItem, activeTab === 'fleet' && styles.tabItemActive]}
        >
          <Text style={[styles.tabText, activeTab === 'fleet' && styles.tabTextActive]}>
            🚚 Recovery Fleet ({reports.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveTab('deposit')}
          style={[styles.tabItem, activeTab === 'deposit' && styles.tabItemActive]}
        >
          <Text style={[styles.tabText, activeTab === 'deposit' && styles.tabTextActive]}>
            💊 Citizen Deposit
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveTab('about')}
          style={[styles.tabItem, activeTab === 'about' && styles.tabItemActive]}
        >
          <Text style={[styles.tabText, activeTab === 'about' && styles.tabTextActive]}>
            🏢 About
          </Text>
        </TouchableOpacity>
      </View>

      {/* ================= TAB 1: FLEET RECOVERY QUEUE ================= */}
      {activeTab === 'fleet' && (
        selectedReport ? (
          /* Report Detail Modal / View */
          <ScrollView style={styles.detailCard}>
            <TouchableOpacity onPress={() => setSelectedReport(null)} style={styles.backBtn}>
              <Text style={styles.backBtnText}>← Back to Recovery Queue</Text>
            </TouchableOpacity>

            <Image source={{ uri: selectedReport.photoUrl }} style={styles.detailImage} />

            <View style={styles.detailContent}>
              <View style={styles.badgeRow}>
                <Text style={styles.tokenText}>{selectedReport.token}</Text>
                <View style={[styles.statusPill, {
                  backgroundColor: selectedReport.status === 'Resolved' ? '#065f46' : selectedReport.status === 'In Progress' ? '#92400e' : '#1e3a8a'
                }]}>
                  <Text style={styles.statusPillText}>{selectedReport.status || 'Pending'}</Text>
                </View>
              </View>

              <Text style={styles.detailBinId}>{selectedReport.binId}</Text>
              <Text style={styles.detailAddress}>📍 {selectedReport.address}</Text>

              {/* Citizen & Voucher Meta */}
              <View style={styles.metaBox}>
                <View style={styles.metaRow}>
                  <Text style={styles.metaLabel}>👤 Deposited By:</Text>
                  <Text style={styles.metaValue}>{selectedReport.userName || 'Anonymous Citizen'}</Text>
                </View>
                <View style={styles.metaRow}>
                  <Text style={styles.metaLabel}>📦 Packaging:</Text>
                  <Text style={styles.metaValue}>{selectedReport.materialType || 'PVC Blister'}</Text>
                </View>
                <View style={styles.metaRow}>
                  <Text style={styles.metaLabel}>🔢 Strip Count:</Text>
                  <Text style={styles.metaValue}>{selectedReport.stripCount || '10 Strips'}</Text>
                </View>
                <View style={styles.metaRow}>
                  <Text style={styles.metaLabel}>🎁 Issued Voucher:</Text>
                  <Text style={styles.metaCode}>{selectedReport.promoCode || 'ECOBLISTER-VOUCHER'}</Text>
                </View>
              </View>

              {selectedReport.notes ? (
                <View style={styles.notesBox}>
                  <Text style={styles.notesTitle}>Citizen Notes / Audio:</Text>
                  <Text style={styles.notesBody}>"{selectedReport.notes}"</Text>
                </View>
              ) : null}

              <TouchableOpacity
                onPress={() => openNavigation(selectedReport.latitude, selectedReport.longitude)}
                style={styles.navButton}
              >
                <Text style={styles.navButtonText}>🗺️ Open Turn-by-Turn Navigation</Text>
              </TouchableOpacity>

              <Text style={styles.actionHeader}>UPDATE RECOVERY PIPELINE:</Text>
              <View style={styles.actionRow}>
                <TouchableOpacity
                  onPress={() => updateStatus(selectedReport.token, 'Assigned')}
                  style={[styles.actionBtn, { backgroundColor: '#1e3a8a' }]}
                >
                  <Text style={styles.actionBtnText}>Assign Route</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => updateStatus(selectedReport.token, 'In Progress')}
                  style={[styles.actionBtn, { backgroundColor: '#b45309' }]}
                >
                  <Text style={styles.actionBtnText}>En Route</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => updateStatus(selectedReport.token, 'Resolved')}
                  style={[styles.actionBtn, { backgroundColor: '#047857' }]}
                >
                  <Text style={styles.actionBtnText}>Recovered</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        ) : (
          /* Live Incoming Queue */
          <FlatList
            data={reports}
            keyExtractor={(item) => item.id || item.token}
            contentContainerStyle={styles.list}
            ListHeaderComponent={
              <View style={styles.queueHeader}>
                <Text style={styles.queueTitle}>Bengaluru Collection Hubs</Text>
                <Text style={styles.queueSub}>Real-time blister deposits submitted from Web & Mobile</Text>
              </View>
            }
            renderItem={({ item }) => (
              <TouchableOpacity onPress={() => setSelectedReport(item)} style={styles.card}>
                <Image source={{ uri: item.photoUrl }} style={styles.cardThumb} />
                <View style={styles.cardInfo}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.cardBinId} numberOfLines={1}>{item.binId}</Text>
                    <Text style={[styles.cardStatus, {
                      color: item.status === 'Resolved' ? '#10b981' : item.status === 'In Progress' ? '#f59e0b' : '#60a5fa'
                    }]}>
                      {item.status || 'Pending'}
                    </Text>
                  </View>
                  <Text style={styles.cardAddress} numberOfLines={1}>{item.address}</Text>
                  <View style={styles.cardStripRow}>
                    <Text style={styles.cardStrips}>💊 {item.stripCount || '10 Strips'}</Text>
                    <Text style={styles.cardUser}>👤 {item.userName || 'Citizen'}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            )}
          />
        )
      )}

      {/* ================= TAB 2: CITIZEN DEPOSIT FORM ================= */}
      {activeTab === 'deposit' && (
        <ScrollView style={styles.formContainer}>
          {generatedVoucher ? (
            /* Instant Voucher Card */
            <View style={styles.voucherCard}>
              <View style={styles.voucherHeader}>
                <Text style={styles.voucherTag}>OFFICIAL MEDICAL VOUCHER</Text>
                <Text style={styles.voucherDiscount}>{generatedVoucher.discount}% OFF</Text>
              </View>
              <Text style={styles.voucherSub}>Valid on next prescription & OTC medicines at tie-up chemist shops</Text>
              
              <View style={styles.voucherCodeBox}>
                <Text style={styles.voucherCodeText}>{generatedVoucher.promoCode}</Text>
                <TouchableOpacity onPress={() => copyPromoCode(generatedVoucher.promoCode)} style={styles.copyBtn}>
                  <Text style={styles.copyBtnText}>Copy</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.voucherMeta}>
                <Text style={styles.voucherMetaLine}>Issued To: <Text style={styles.boldWhite}>{generatedVoucher.userName}</Text></Text>
                <Text style={styles.voucherMetaLine}>Drop-off Bin: <Text style={styles.boldWhite}>{generatedVoucher.binId}</Text></Text>
                <Text style={styles.voucherMetaLine}>Strips Deposited: <Text style={styles.boldWhite}>{generatedVoucher.strips}</Text></Text>
              </View>

              <TouchableOpacity
                onPress={() => setGeneratedVoucher(null)}
                style={styles.newDepositBtn}
              >
                <Text style={styles.newDepositBtnText}>Deposit Another Blister Batch</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.formCard}>
              <Text style={styles.formTitle}>Deposit Blister Packaging</Text>
              <Text style={styles.formSub}>
                Currently in Bengaluru • Expanding across India soon
              </Text>

              {/* Citizen Details */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  Full Name <Text style={styles.required}>* (Required)</Text>
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Ramesh Gowda"
                  placeholderTextColor="#64748b"
                  value={fullName}
                  onChangeText={setFullName}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Email Address (Optional)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="name@gmail.com"
                  placeholderTextColor="#64748b"
                  keyboardType="email-address"
                  value={email}
                  onChangeText={setEmail}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Mobile Phone (Optional)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="+91 98765 43210"
                  placeholderTextColor="#64748b"
                  keyboardType="phone-pad"
                  value={phone}
                  onChangeText={setPhone}
                />
              </View>

              {/* Location Picker */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Bengaluru Collection Hub</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillScroll}>
                  {BENGALURU_LOCATIONS.map((loc) => (
                    <TouchableOpacity
                      key={loc.id}
                      onPress={() => setSelectedBin(loc.id)}
                      style={[styles.locationChip, selectedBin === loc.id && styles.locationChipActive]}
                    >
                      <Text style={[styles.locationChipText, selectedBin === loc.id && styles.locationChipTextActive]}>
                        {loc.id}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Packaging Material */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Blister Packaging Material</Text>
                {PACKAGING_MATERIALS.map((mat) => (
                  <TouchableOpacity
                    key={mat}
                    onPress={() => setMaterial(mat)}
                    style={[styles.radioItem, material === mat && styles.radioItemActive]}
                  >
                    <View style={[styles.radioCircle, material === mat && styles.radioCircleActive]} />
                    <Text style={[styles.radioText, material === mat && styles.radioTextActive]}>{mat}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Strip Count Tiers */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Number of Empty Strips Deposited</Text>
                <View style={styles.tierGrid}>
                  {STRIP_TIERS.map((tier) => (
                    <TouchableOpacity
                      key={tier.label}
                      onPress={() => setSelectedTier(tier)}
                      style={[styles.tierCard, selectedTier.label === tier.label && styles.tierCardActive]}
                    >
                      <Text style={[styles.tierLabel, selectedTier.label === tier.label && styles.tierLabelActive]}>
                        {tier.label}
                      </Text>
                      <Text style={styles.tierDiscount}>{tier.discount}% Voucher</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Submit Button */}
              <TouchableOpacity
                onPress={handleDepositSubmit}
                disabled={submitting}
                style={styles.submitBtn}
              >
                <Text style={styles.submitBtnText}>
                  {submitting ? 'Generating Voucher...' : `Submit & Claim ${selectedTier.discount}% Discount`}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      )}

      {/* ================= TAB 3: ABOUT ECO-BLISTERS ================= */}
      {activeTab === 'about' && (
        <ScrollView style={styles.aboutContainer}>
          <View style={styles.aboutCard}>
            <Text style={styles.aboutHeader}>Eco-Blisters Initiative</Text>
            <Text style={styles.aboutTagline}>Collect • Track • Recover</Text>
            <Text style={styles.aboutDesc}>
              Eco-Blisters is a circular healthcare recovery ecosystem dedicated to diverting post-consumer pharmaceutical blister foil packages from landfills. We partner with local hospitals, pharmacies, and clinics to recover pure aluminum and polymer granules.
            </Text>

            <View style={styles.aboutSection}>
              <Text style={styles.aboutSectionTitle}>📍 Operating Footprint</Text>
              <Text style={styles.aboutSectionText}>Currently in Bengaluru • Expanding Across India Soon</Text>
            </View>

            <View style={styles.aboutSection}>
              <Text style={styles.aboutSectionTitle}>📞 Official Contact</Text>
              <Text style={styles.aboutSectionText}>Company: Ecoblister</Text>
              <Text style={styles.aboutSectionText}>Phone: +91 9117472155</Text>
              <Text style={styles.aboutSectionText}>Email: xxxxxxxxxx@gmail.com</Text>
            </View>

            <View style={styles.aboutSection}>
              <Text style={styles.aboutSectionTitle}>🌐 Social Channels</Text>
              <Text style={styles.aboutSectionText}>• Instagram: @ecoblister</Text>
              <Text style={styles.aboutSectionText}>• Facebook: /ecoblister.official</Text>
              <Text style={styles.aboutSectionText}>• X (Twitter): @ecoblister</Text>
            </View>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#022c22' },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#064e3b',
    backgroundColor: '#022c22'
  },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logoBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#059669',
    alignItems: 'center',
    justifyContent: 'center'
  },
  logoPill: { fontSize: 18 },
  brandTitle: { fontSize: 18, fontWeight: '900', color: '#ffffff', letterSpacing: 0.5 },
  tagline: { fontSize: 10, color: '#6ee7b7', fontWeight: '700', letterSpacing: 0.3 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#059669'
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusBadgeText: { fontSize: 10, color: '#d1fae5', fontWeight: '700' },
  configBtn: {
    backgroundColor: '#064e3b',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#059669'
  },
  configBtnText: { fontSize: 11, color: '#34d399', fontWeight: 'bold' },
  configBox: {
    backgroundColor: '#064e3b',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#059669'
  },
  configLabel: { fontSize: 11, color: '#a7f3d0', marginBottom: 4, fontWeight: 'bold' },
  configInput: {
    backgroundColor: '#022c22',
    color: '#ffffff',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    fontSize: 12,
    borderWidth: 1,
    borderColor: '#059669'
  },
  quickUrlRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  quickUrlBtn: {
    flex: 1,
    backgroundColor: '#059669',
    paddingVertical: 6,
    borderRadius: 6,
    alignItems: 'center'
  },
  quickUrlBtnText: { color: '#ffffff', fontSize: 10, fontWeight: 'bold' },

  /* Tabs */
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#064e3b',
    paddingHorizontal: 8,
    paddingVertical: 6,
    gap: 6
  },
  tabItem: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center'
  },
  tabItemActive: { backgroundColor: '#059669' },
  tabText: { fontSize: 11, fontWeight: '700', color: '#a7f3d0' },
  tabTextActive: { color: '#ffffff' },

  /* Queue List */
  list: { padding: 12, paddingBottom: 30 },
  queueHeader: { marginBottom: 12 },
  queueTitle: { fontSize: 16, fontWeight: '900', color: '#ffffff' },
  queueSub: { fontSize: 11, color: '#6ee7b7' },
  card: {
    flexDirection: 'row',
    backgroundColor: '#064e3b',
    borderRadius: 16,
    marginBottom: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#047857'
  },
  cardThumb: { width: 85, height: 85, backgroundColor: '#022c22' },
  cardInfo: { flex: 1, padding: 10, justifyContent: 'center' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardBinId: { fontSize: 13, fontWeight: '800', color: '#ffffff', flex: 1, marginRight: 6 },
  cardStatus: { fontSize: 10, fontWeight: 'bold' },
  cardAddress: { fontSize: 11, color: '#a7f3d0', marginVertical: 3 },
  cardStripRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 },
  cardStrips: { fontSize: 11, fontWeight: '700', color: '#34d399' },
  cardUser: { fontSize: 11, color: '#d1fae5' },

  /* Report Detail */
  detailCard: { flex: 1, backgroundColor: '#022c22' },
  backBtn: { padding: 12, backgroundColor: '#064e3b' },
  backBtnText: { color: '#34d399', fontWeight: 'bold', fontSize: 13 },
  detailImage: { width: '100%', height: 200, backgroundColor: '#064e3b' },
  detailContent: { padding: 16 },
  badgeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  tokenText: { color: '#34d399', fontWeight: '900', fontSize: 14 },
  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusPillText: { color: '#ffffff', fontSize: 11, fontWeight: 'bold' },
  detailBinId: { fontSize: 18, fontWeight: '900', color: '#ffffff', marginBottom: 4 },
  detailAddress: { fontSize: 12, color: '#a7f3d0', marginBottom: 12 },
  metaBox: { backgroundColor: '#064e3b', padding: 12, borderRadius: 12, gap: 6, marginBottom: 12 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between' },
  metaLabel: { fontSize: 11, color: '#a7f3d0' },
  metaValue: { fontSize: 11, color: '#ffffff', fontWeight: 'bold' },
  metaCode: { fontSize: 11, color: '#34d399', fontWeight: '900' },
  notesBox: { backgroundColor: '#064e3b', padding: 10, borderRadius: 10, marginBottom: 12 },
  notesTitle: { fontSize: 11, color: '#34d399', fontWeight: 'bold' },
  notesBody: { fontSize: 12, color: '#ffffff', fontStyle: 'italic', marginTop: 2 },
  navButton: {
    backgroundColor: '#059669',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16
  },
  navButtonText: { color: '#ffffff', fontWeight: 'bold', fontSize: 13 },
  actionHeader: { fontSize: 11, fontWeight: 'bold', color: '#a7f3d0', marginBottom: 8 },
  actionRow: { flexDirection: 'row', gap: 8 },
  actionBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  actionBtnText: { color: '#ffffff', fontWeight: 'bold', fontSize: 11 },

  /* Citizen Deposit Form */
  formContainer: { flex: 1, backgroundColor: '#022c22', padding: 14 },
  formCard: { backgroundColor: '#064e3b', padding: 16, borderRadius: 20, marginBottom: 25 },
  formTitle: { fontSize: 18, fontWeight: '900', color: '#ffffff', marginBottom: 2 },
  formSub: { fontSize: 11, color: '#34d399', marginBottom: 16 },
  inputGroup: { marginBottom: 14 },
  inputLabel: { fontSize: 11, fontWeight: '700', color: '#d1fae5', marginBottom: 6 },
  required: { color: '#f87171' },
  input: {
    backgroundColor: '#022c22',
    color: '#ffffff',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    borderWidth: 1,
    borderColor: '#059669'
  },
  pillScroll: { flexDirection: 'row', gap: 6 },
  locationChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#022c22',
    borderWidth: 1,
    borderColor: '#059669',
    marginRight: 6
  },
  locationChipActive: { backgroundColor: '#059669', borderColor: '#34d399' },
  locationChipText: { fontSize: 11, color: '#a7f3d0', fontWeight: '600' },
  locationChipTextActive: { color: '#ffffff', fontWeight: 'bold' },
  radioItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: '#022c22',
    borderRadius: 8,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#059669'
  },
  radioItemActive: { borderColor: '#34d399' },
  radioCircle: { width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: '#6ee7b7', marginRight: 10 },
  radioCircleActive: { backgroundColor: '#34d399' },
  radioText: { fontSize: 11, color: '#d1fae5' },
  radioTextActive: { color: '#ffffff', fontWeight: 'bold' },
  tierGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tierCard: {
    width: '48%',
    backgroundColor: '#022c22',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#059669',
    alignItems: 'center'
  },
  tierCardActive: { backgroundColor: '#047857', borderColor: '#34d399' },
  tierLabel: { fontSize: 12, fontWeight: '700', color: '#ffffff' },
  tierLabelActive: { color: '#ffffff' },
  tierDiscount: { fontSize: 11, fontWeight: '900', color: '#fbbf24', marginTop: 2 },
  submitBtn: {
    backgroundColor: '#10b981',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#10b981',
    shadowOpacity: 0.3,
    shadowRadius: 10
  },
  submitBtnText: { color: '#022c22', fontWeight: '900', fontSize: 14, letterSpacing: 0.3 },

  /* Voucher Card */
  voucherCard: {
    backgroundColor: '#064e3b',
    borderRadius: 24,
    padding: 20,
    borderWidth: 2,
    borderColor: '#34d399',
    alignItems: 'center',
    marginVertical: 10
  },
  voucherHeader: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', alignItems: 'center' },
  voucherTag: { fontSize: 10, color: '#34d399', fontWeight: '900', letterSpacing: 1 },
  voucherDiscount: { fontSize: 24, fontWeight: '900', color: '#fbbf24' },
  voucherSub: { fontSize: 11, color: '#d1fae5', textAlign: 'center', marginVertical: 12 },
  voucherCodeBox: {
    backgroundColor: '#022c22',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: '#059669',
    marginBottom: 16
  },
  voucherCodeText: { fontSize: 16, fontWeight: '900', color: '#34d399', letterSpacing: 1 },
  copyBtn: { backgroundColor: '#059669', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  copyBtnText: { color: '#ffffff', fontSize: 11, fontWeight: 'bold' },
  voucherMeta: { width: '100%', backgroundColor: '#022c22', padding: 12, borderRadius: 12, gap: 4, marginBottom: 16 },
  voucherMetaLine: { fontSize: 11, color: '#a7f3d0' },
  boldWhite: { color: '#ffffff', fontWeight: 'bold' },
  newDepositBtn: { backgroundColor: '#059669', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 10 },
  newDepositBtnText: { color: '#ffffff', fontWeight: 'bold', fontSize: 12 },

  /* About Tab */
  aboutContainer: { flex: 1, backgroundColor: '#022c22', padding: 14 },
  aboutCard: { backgroundColor: '#064e3b', padding: 18, borderRadius: 20, gap: 14 },
  aboutHeader: { fontSize: 20, fontWeight: '900', color: '#ffffff' },
  aboutTagline: { fontSize: 12, color: '#34d399', fontWeight: 'bold' },
  aboutDesc: { fontSize: 12, color: '#d1fae5', lineHeight: 18 },
  aboutSection: { borderTopWidth: 1, borderTopColor: '#059669', paddingTop: 10 },
  aboutSectionTitle: { fontSize: 12, fontWeight: 'bold', color: '#ffffff', marginBottom: 4 },
  aboutSectionText: { fontSize: 11, color: '#a7f3d0', lineHeight: 16 }
});
