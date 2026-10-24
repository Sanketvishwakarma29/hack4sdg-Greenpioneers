import React, { useState, useEffect, useMemo } from 'react';
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
const PUBLIC_TUNNEL = 'https://framework-drive-inclusive-rack.trycloudflare.com';
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
  const [activeTab, setActiveTab] = useState('fleet'); // 'fleet' | 'analytics' | 'economics' | 'deposit' | 'about'
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

  // Unit Economics Calculator
  const [stripsMonthly, setStripsMonthly] = useState(50000);
  const [aluPrice, setAluPrice] = useState(220); // ₹/kg
  const [polymerPrice, setPolymerPrice] = useState(45); // ₹/kg
  const [affiliateFee, setAffiliateFee] = useState(15); // ₹/voucher

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

      s.on('disconnect', () => setConnected(false));
      s.on('connect_error', () => setConnected(false));

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

  // Status transitions
  const updateStatus = async (token, newStatus) => {
    try {
      const res = await fetch(`${serverUrl}/api/reports/${encodeURIComponent(token)}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          driverName: 'Eco-Blisters Recovery Fleet (Van #01)',
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

  const openNavigation = (lat, lng) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    Linking.openURL(url);
  };

  // Submit Blister Deposit
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

  // Unit Economics Math
  const weightKg = (stripsMonthly * 1.6) / 1000;
  const aluKg = weightKg * 0.32;
  const polymerKg = weightKg * 0.68;
  const revAlu = Math.round(aluKg * aluPrice);
  const revPoly = Math.round(polymerKg * polymerPrice);
  const revAffiliate = Math.round(((stripsMonthly / 12) * 0.7) * affiliateFee);
  const grossRev = revAlu + revPoly + revAffiliate;
  const opex = Math.round(stripsMonthly * 0.60); // ₹0.35 logistics + ₹0.25 processing
  const netProfit = grossRev - opex;
  const marginPct = grossRev > 0 ? ((netProfit / grossRev) * 100).toFixed(1) : 0;

  // Active Promocodes Count
  const activePromos = reports.filter(r => r.promoCode).length || reports.length;

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

      {/* Modern Multi-Tab Selector */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabBarScroll} contentContainerStyle={styles.tabBar}>
        <TouchableOpacity
          onPress={() => { setActiveTab('fleet'); setSelectedReport(null); }}
          style={[styles.tabItem, activeTab === 'fleet' && styles.tabItemActive]}
        >
          <Text style={[styles.tabText, activeTab === 'fleet' && styles.tabTextActive]}>
            🚚 Fleet ({reports.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveTab('analytics')}
          style={[styles.tabItem, activeTab === 'analytics' && styles.tabItemActive]}
        >
          <Text style={[styles.tabText, activeTab === 'analytics' && styles.tabTextActive]}>
            📊 Graphs & Shops
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveTab('economics')}
          style={[styles.tabItem, activeTab === 'economics' && styles.tabItemActive]}
        >
          <Text style={[styles.tabText, activeTab === 'economics' && styles.tabTextActive]}>
            🧮 Unit Economics
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
            🏢 Impact & SOP
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* ================= TAB 1: FLEET RECOVERY QUEUE ================= */}
      {activeTab === 'fleet' && (
        selectedReport ? (
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

              <View style={styles.metaBox}>
                <View style={styles.metaRow}>
                  <Text style={styles.metaLabel}>👤 Deposited By:</Text>
                  <Text style={styles.metaValue}>{selectedReport.userName || 'Citizen'}</Text>
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
                  <Text style={styles.metaLabel}>🎁 Active Voucher:</Text>
                  <Text style={styles.metaCode}>{selectedReport.promoCode || 'ECOBLISTER-VOUCHER'}</Text>
                </View>
              </View>

              {selectedReport.notes ? (
                <View style={styles.notesBox}>
                  <Text style={styles.notesTitle}>Citizen Notes / Voice:</Text>
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
          <FlatList
            data={reports}
            keyExtractor={(item) => item.id || item.token}
            contentContainerStyle={styles.list}
            ListHeaderComponent={
              <View style={styles.queueHeader}>
                <View style={styles.metricRow}>
                  <View style={styles.metricCard}>
                    <Text style={styles.metricLabel}>Total Deposits</Text>
                    <Text style={styles.metricVal}>{reports.length}</Text>
                  </View>
                  <View style={styles.metricCard}>
                    <Text style={styles.metricLabel}>Active Promos</Text>
                    <Text style={[styles.metricVal, { color: '#fbbf24' }]}>{activePromos}</Text>
                  </View>
                </View>
                <Text style={styles.queueTitle}>Bengaluru Drop-off Hubs</Text>
                <Text style={styles.queueSub}>Real-time stream of verified blister batches</Text>
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

      {/* ================= TAB 2: RECOVERY GRAPHS & SHOPS ================= */}
      {activeTab === 'analytics' && (
        <ScrollView style={styles.formContainer}>
          <View style={styles.analyticsCard}>
            <Text style={styles.analyticsTitle}>📊 Blister Recovery Distribution</Text>
            <Text style={styles.analyticsSub}>Recovery volume breakdown across Bengaluru pharmacy hubs</Text>

            {BENGALURU_LOCATIONS.map((loc, idx) => {
              const count = 35 + (idx * 15);
              const pct = Math.min(100, Math.round((count / 140) * 100));
              return (
                <View key={loc.id} style={styles.graphRow}>
                  <View style={styles.graphLabelRow}>
                    <Text style={styles.graphLabel} numberOfLines={1}>#{idx + 1} {loc.id.split('-')[0]}</Text>
                    <Text style={styles.graphCount}>{count} strips ({(count * 0.5).toFixed(0)}g Al)</Text>
                  </View>
                  <View style={styles.barTrack}>
                    <View style={[styles.barFill, { width: `${pct}%` }]} />
                  </View>
                </View>
              );
            })}
          </View>
        </ScrollView>
      )}

      {/* ================= TAB 3: UNIT ECONOMICS CALCULATOR ================= */}
      {activeTab === 'economics' && (
        <ScrollView style={styles.formContainer}>
          <View style={styles.economicsCard}>
            <Text style={styles.analyticsTitle}>🧮 Unit Economics Calculator</Text>
            <Text style={styles.analyticsSub}>Simulating circular material recovery revenue & margins</Text>

            {/* Monthly Volume */}
            <View style={styles.econInputGroup}>
              <Text style={styles.econLabel}>Monthly Strips Collected: {stripsMonthly.toLocaleString()}</Text>
              <View style={styles.econPresetRow}>
                <TouchableOpacity onPress={() => setStripsMonthly(10000)} style={[styles.econPresetBtn, stripsMonthly === 10000 && styles.econPresetActive]}>
                  <Text style={styles.econPresetText}>10k Pilot</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setStripsMonthly(50000)} style={[styles.econPresetBtn, stripsMonthly === 50000 && styles.econPresetActive]}>
                  <Text style={styles.econPresetText}>50k City</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setStripsMonthly(200000)} style={[styles.econPresetBtn, stripsMonthly === 200000 && styles.econPresetActive]}>
                  <Text style={styles.econPresetText}>200k Scale</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Results Banner */}
            <View style={styles.profitBanner}>
              <Text style={styles.profitLabel}>ESTIMATED NET MONTHLY PROFIT</Text>
              <Text style={styles.profitVal}>₹{netProfit.toLocaleString()}</Text>
              <Text style={styles.profitMargin}>{marginPct}% Profit Margin (₹{(netProfit/stripsMonthly).toFixed(2)} / strip)</Text>
            </View>

            {/* Breakdown */}
            <View style={styles.econGrid}>
              <View style={styles.econCol}>
                <Text style={styles.econColHeader}>REVENUE</Text>
                <Text style={styles.econLine}>Pure Aluminum: ₹{revAlu.toLocaleString()}</Text>
                <Text style={styles.econLine}>Polymer Pellets: ₹{revPoly.toLocaleString()}</Text>
                <Text style={styles.econLine}>Chemist Affiliate: ₹{revAffiliate.toLocaleString()}</Text>
                <Text style={[styles.econLine, styles.boldWhite]}>Gross: ₹{grossRev.toLocaleString()}</Text>
              </View>
              <View style={styles.econCol}>
                <Text style={[styles.econColHeader, { color: '#f87171' }]}>COSTS</Text>
                <Text style={styles.econLine}>EV Logistics: ₹{Math.round(stripsMonthly * 0.35).toLocaleString()}</Text>
                <Text style={styles.econLine}>Processing: ₹{Math.round(stripsMonthly * 0.25).toLocaleString()}</Text>
                <Text style={[styles.econLine, { color: '#f87171', fontWeight: 'bold' }]}>Total: ₹{opex.toLocaleString()}</Text>
              </View>
            </View>
          </View>
        </ScrollView>
      )}

      {/* ================= TAB 4: CITIZEN DEPOSIT FORM ================= */}
      {activeTab === 'deposit' && (
        <ScrollView style={styles.formContainer}>
          {generatedVoucher ? (
            <View style={styles.voucherCard}>
              <View style={styles.voucherHeader}>
                <Text style={styles.voucherTag}>OFFICIAL MEDICAL VOUCHER</Text>
                <Text style={styles.voucherDiscount}>{generatedVoucher.discount}% OFF</Text>
              </View>
              <Text style={styles.voucherSub}>Valid on prescription & OTC medicines at tie-up chemist shops</Text>
              
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
              <Text style={styles.formSub}>Currently in Bengaluru • Expanding across India soon</Text>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Full Name <Text style={styles.required}>* (Required)</Text></Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Ramesh Gowda"
                  placeholderTextColor="#64748b"
                  value={fullName}
                  onChangeText={setFullName}
                />
              </View>

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

      {/* ================= TAB 5: ABOUT, SOP & SHOP PROFIT ================= */}
      {activeTab === 'about' && (
        <ScrollView style={styles.aboutContainer}>
          <View style={styles.aboutCard}>
            <Text style={styles.aboutHeader}>How Partner Shops Profit</Text>
            <Text style={styles.aboutTagline}>Commercial & Environmental Partnership Model</Text>
            
            <View style={styles.aboutSection}>
              <Text style={styles.aboutSectionTitle}>🏪 Chemist Store Benefits</Text>
              <Text style={styles.aboutSectionText}>• +24.8% incremental walk-in customer footfall to redeem vouchers</Text>
              <Text style={styles.aboutSectionText}>• ₹340 average basket upsell on vitamins, OTC, and toiletries</Text>
              <Text style={styles.aboutSectionText}>• Zero capital expense — collection bins and logistics provided 100% free</Text>
            </View>

            <View style={styles.aboutSection}>
              <Text style={styles.aboutSectionTitle}>🔄 How We Collect (SOP)</Text>
              <Text style={styles.aboutSectionText}>1. Citizens deposit empty blister packs in store drop-boxes.</Text>
              <Text style={styles.aboutSectionText}>2. Low-emission EV vans sweep Bengaluru clusters on scheduled routes.</Text>
              <Text style={styles.aboutSectionText}>3. QR codes scanned and batches weighed upon collection.</Text>
              <Text style={styles.aboutSectionText}>4. Delamination yields 99.2% pure aluminum powder & polymer pellets.</Text>
            </View>

            <View style={styles.aboutSection}>
              <Text style={styles.aboutSectionTitle}>🌱 City Cleanliness & Impact</Text>
              <Text style={styles.aboutSectionText}>• 100% diverted from Bengaluru landfills (Mandur/Mittaganahalli)</Text>
              <Text style={styles.aboutSectionText}>• Prevents drain clogs in storm channels & Bellandur lake</Text>
              <Text style={styles.aboutSectionText}>• Prevents toxic dioxin emissions from open trash burning</Text>
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

  tabBarScroll: { maxHeight: 48, backgroundColor: '#064e3b' },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: 8,
    paddingVertical: 6,
    gap: 6
  },
  tabItem: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#022c22'
  },
  tabItemActive: { backgroundColor: '#059669' },
  tabText: { fontSize: 11, fontWeight: '700', color: '#a7f3d0' },
  tabTextActive: { color: '#ffffff' },

  list: { padding: 12, paddingBottom: 30 },
  queueHeader: { marginBottom: 12 },
  metricRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  metricCard: {
    flex: 1,
    backgroundColor: '#064e3b',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#059669'
  },
  metricLabel: { fontSize: 10, color: '#a7f3d0', fontWeight: 'bold' },
  metricVal: { fontSize: 18, fontWeight: '900', color: '#ffffff', marginTop: 2 },
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
    marginTop: 10
  },
  submitBtnText: { color: '#022c22', fontWeight: '900', fontSize: 14 },

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

  // Analytics Card
  analyticsCard: { backgroundColor: '#064e3b', padding: 16, borderRadius: 20, marginBottom: 20 },
  analyticsTitle: { fontSize: 16, fontWeight: '900', color: '#ffffff' },
  analyticsSub: { fontSize: 11, color: '#a7f3d0', marginBottom: 16 },
  graphRow: { marginBottom: 12 },
  graphLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  graphLabel: { fontSize: 11, color: '#ffffff', fontWeight: 'bold', maxWidth: 180 },
  graphCount: { fontSize: 11, color: '#34d399', fontWeight: 'bold' },
  barTrack: { height: 8, backgroundColor: '#022c22', borderRadius: 4, overflow: 'hidden' },
  barFill: { height: '100%', backgroundColor: '#10b981', borderRadius: 4 },

  // Unit Economics
  economicsCard: { backgroundColor: '#064e3b', padding: 16, borderRadius: 20, marginBottom: 20 },
  econInputGroup: { marginBottom: 14 },
  econLabel: { fontSize: 12, fontWeight: 'bold', color: '#d1fae5', marginBottom: 8 },
  econPresetRow: { flexDirection: 'row', gap: 6 },
  econPresetBtn: { flex: 1, paddingVertical: 6, backgroundColor: '#022c22', borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: '#059669' },
  econPresetActive: { backgroundColor: '#059669' },
  econPresetText: { fontSize: 11, color: '#ffffff', fontWeight: 'bold' },
  profitBanner: { backgroundColor: '#022c22', padding: 14, borderRadius: 14, alignItems: 'center', marginVertical: 12, borderWidth: 1, borderColor: '#34d399' },
  profitLabel: { fontSize: 10, color: '#34d399', fontWeight: 'bold', letterSpacing: 0.5 },
  profitVal: { fontSize: 24, fontWeight: '900', color: '#ffffff', marginVertical: 4 },
  profitMargin: { fontSize: 11, color: '#fbbf24', fontWeight: 'bold' },
  econGrid: { flexDirection: 'row', gap: 8 },
  econCol: { flex: 1, backgroundColor: '#022c22', padding: 10, borderRadius: 10 },
  econColHeader: { fontSize: 10, fontWeight: 'bold', color: '#34d399', marginBottom: 6 },
  econLine: { fontSize: 10, color: '#a7f3d0', marginBottom: 4 },

  aboutContainer: { flex: 1, backgroundColor: '#022c22', padding: 14 },
  aboutCard: { backgroundColor: '#064e3b', padding: 18, borderRadius: 20, gap: 14 },
  aboutHeader: { fontSize: 18, fontWeight: '900', color: '#ffffff' },
  aboutTagline: { fontSize: 11, color: '#34d399', fontWeight: 'bold' },
  aboutSection: { borderTopWidth: 1, borderTopColor: '#059669', paddingTop: 10 },
  aboutSectionTitle: { fontSize: 12, fontWeight: 'bold', color: '#ffffff', marginBottom: 4 },
  aboutSectionText: { fontSize: 11, color: '#a7f3d0', lineHeight: 18 }
});
