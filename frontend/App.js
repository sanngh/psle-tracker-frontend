import React, { useContext, useEffect, useRef, useState } from 'react';
import { AppState as NativeAppState, StyleSheet, View, Text, TouchableOpacity, ScrollView, Modal, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage'; // Ensure this package is installed
import { AppProvider, AppContext } from './context/AppContext';
import { useDashboardData } from './hooks/useDashboardData';
import { API_BASE_URL } from './appConfig';

import LoginView from './components/LoginView';
import OnboardingView from './components/OnboardingView';
import PinSetupView from './components/PinSetupView';
import PinVerifyView from './components/PinVerifyView';
import StudentDeck from './screens/StudentDeck';
import ParentDeck from './screens/ParentDeck';

// Directly read the data from your json file cleanly without heavy external md packages
import disclaimerData from './disclaimer.json'; 

function MainAppNavigator() {
  // Added phone (or equivalent identifier your context exposes upon login)
  const { appState, profileType, setProfileType, setDashboardData, phone, startUserSession, heartbeatUserSession, endUserSession } = useContext(AppContext);
  const [countdownText, setCountdownText] = useState('Calculating...');
  const nativeAppStateRef = useRef(NativeAppState.currentState);
  
  // PDPA Legal Blocker States
  const [showPdpaModal, setShowPdpaModal] = useState(false);
  const [isCheckboxChecked, setIsCheckboxChecked] = useState(false);
  const [isSubmittingConsent, setIsSubmittingConsent] = useState(false);
  const [consentSubmitError, setConsentSubmitError] = useState('');

  // Student accounts stay locked until their linked parent has accepted consent on their behalf
  const [studentLockStatus, setStudentLockStatus] = useState(null);
  const [lockCheckTick, setLockCheckTick] = useState(0);

  // Blocks the dashboard from flashing before we know whether the PDPA modal must show
  const [isConsentCheckPending, setIsConsentCheckPending] = useState(true);

  useDashboardData();

  useEffect(() => {
    if (appState !== 'dashboard' || !phone) return undefined;

    startUserSession(phone, profileType).catch(error => console.error('Session start failed:', error));
    const heartbeatInterval = setInterval(() => {
      heartbeatUserSession().catch(error => console.error('Session heartbeat failed:', error));
    }, 30000);
    const subscription = NativeAppState.addEventListener('change', nextState => {
      const previousState = nativeAppStateRef.current;
      nativeAppStateRef.current = nextState;
      // Don't end the session on backgrounding: this session row also backs the Authorization
      // bearer token, so ending it here invalidated the token and broke every request on resume.
      if (nextState === 'active' && previousState !== 'active') {
        heartbeatUserSession().catch(error => console.error('Session heartbeat failed:', error));
      }
    });

    return () => {
      clearInterval(heartbeatInterval);
      subscription.remove();
    };
  }, [appState, phone, profileType, startUserSession, heartbeatUserSession, endUserSession]);

  // PSLE Exam Countdown Utility Function
  useEffect(() => {
    const updatePsleCountdown = () => {
      const targetDate = new Date('2026-09-24T08:15:00');
      const difference = targetDate - new Date();

      if (difference <= 0) {
        setCountdownText('✏️ PSLE Written Exams are underway!');
        return;
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      setCountdownText(`⏳ ${days} Days, ${hours} Hours, and ${minutes} Minutes left until PSLE 2026`);
    };

    updatePsleCountdown();
    const timerId = setInterval(updatePsleCountdown, 60000);
    return () => clearInterval(timerId);
  }, []);

  // Intercepting Effect: the database is the source of truth for consent; AsyncStorage is only an offline cache
  useEffect(() => {
    const checkPdpaConsentStatus = async () => {
      // Check only if they cleared login and onboarding states AND we have their phone number context
      if (appState === 'login' || appState === 'onboarding') {
        setShowPdpaModal(false);
        setIsConsentCheckPending(false);
        return;
      }
      setIsConsentCheckPending(true);

      const identifier = phone ? phone.trim() : 'unknown_user';
      const dynamicStorageKey = `@pdpa_consent_${disclaimerData.version}_phone_${identifier}`;

      try {
        const response = await fetch(`${API_BASE_URL}/consent/status`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userPhone: identifier, disclaimer: disclaimerData })
        });
        if (!response.ok) throw new Error(`Consent status check failed with ${response.status}`);
        const status = await response.json();
        if (status.accepted) {
          await AsyncStorage.setItem(dynamicStorageKey, 'true');
        }
        setShowPdpaModal(!status.accepted);
      } catch (error) {
        console.error('Error verifying legal compliance status from server:', error);
        // Offline fallback: trust a previously confirmed local cache for this exact consent version
        const cachedConsent = await AsyncStorage.getItem(dynamicStorageKey).catch(() => null);
        setShowPdpaModal(cachedConsent !== 'true');
      } finally {
        setIsConsentCheckPending(false);
      }
    };

    checkPdpaConsentStatus();
  }, [appState, phone]); // Triggers check if user details update or session switches

  // Intercepting Effect: a student's dashboard stays locked until their linked parent has consented
  useEffect(() => {
    if (appState !== 'dashboard' || profileType !== 'student' || !phone) {
      setStudentLockStatus(null);
      return undefined;
    }

    let cancelled = false;
    const identifier = phone.trim();
    const cacheKey = `@child_unlock_phone_${identifier}`;

    const checkChildLockStatus = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/consent/child-status`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userPhone: identifier })
        });
        if (!response.ok) throw new Error(`Child status check failed with ${response.status}`);
        const status = await response.json();
        if (cancelled) return;
        setStudentLockStatus(status);
        if (status.unlocked) await AsyncStorage.setItem(cacheKey, 'true');
      } catch (error) {
        console.error('Error checking parent consent status:', error);
        // Offline fallback: trust a previously confirmed unlock so a network blip does not lock out an already-approved student
        const cachedUnlocked = (await AsyncStorage.getItem(cacheKey).catch(() => null)) === 'true';
        if (!cancelled) setStudentLockStatus({ unlocked: cachedUnlocked, linked: cachedUnlocked, parentConsented: cachedUnlocked, offlineFallback: true });
      }
    };

    checkChildLockStatus();
    return () => { cancelled = true; };
  }, [appState, profileType, phone, lockCheckTick]);

  const handleConsentAcceptance = async () => {
    if (!isCheckboxChecked || isSubmittingConsent) return;
    setIsSubmittingConsent(true);
    setConsentSubmitError('');
    const identifier = phone ? phone.trim() : 'unknown_user';
    try {
      const response = await fetch(`${API_BASE_URL}/consent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userPhone: identifier, role: profileType, disclaimer: disclaimerData })
      });
      if (!response.ok) throw new Error(`Consent recording failed with ${response.status}`);

      const dynamicStorageKey = `@pdpa_consent_${disclaimerData.version}_phone_${identifier}`;
      await AsyncStorage.setItem(dynamicStorageKey, 'true');
      setShowPdpaModal(false);
    } catch (error) {
      console.error('Error recording consent to server:', error);
      setConsentSubmitError('Could not save your consent. Please check your connection and try again.');
    } finally {
      setIsSubmittingConsent(false);
    }
  };

  if (appState === 'login') {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <LoginView />
      </SafeAreaView>
    );
  }

  if (appState === 'onboarding') {
    return (
      <SafeAreaView style={styles.baseContainer}>
        <OnboardingView />
      </SafeAreaView>
    );
  }

  if (appState === 'pin-setup') {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <PinSetupView />
      </SafeAreaView>
    );
  }

  if (appState === 'pin-verify') {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <PinVerifyView />
      </SafeAreaView>
    );
  }

  if (isConsentCheckPending) {
    return (
      <SafeAreaView style={styles.loadingScreenContainer}>
        <Text style={styles.loadingScreenTitle}>🏅 PSLE Tracker</Text>
        <ActivityIndicator size="large" color="#1abc9c" style={styles.loadingScreenSpinner} />
        <Text style={styles.loadingScreenText}>Getting things ready…</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.baseContainer}>
      {/* PDPA Fullscreen Compliance Blocker View */}
      <Modal visible={showPdpaModal} animationType="slide" transparent={false}>
        <SafeAreaView style={styles.pdpaContainer}>
          <View style={styles.pdpaHeader}>
            <Text style={styles.pdpaTitleText}>{disclaimerData.title}</Text>
          </View>

          <ScrollView style={styles.pdpaScrollBody} contentContainerStyle={styles.pdpaScrollPadding}>
            {profileType === 'student' && studentLockStatus?.parentConsented && (
              <Text style={styles.pdpaParentNoticeText}>✅ Your parent has already accepted this on your behalf. Please review and confirm below for your own account too.</Text>
            )}
            <Text style={styles.pdpaIntroText}>{disclaimerData.introduction}</Text>
            <Text style={styles.pdpaHeadingText}>{disclaimerData.sectionTitle}</Text>
            {disclaimerData.terms.map((term, idx) => (
              <Text key={idx} style={styles.pdpaTermItemText}>{term}</Text>
            ))}
          </ScrollView>

          <View style={styles.pdpaFooterContainer}>
            {/* Interactive Confirmation Checkbox wrapper */}
            <TouchableOpacity 
              style={styles.pdpaCheckboxRow} 
              onPress={() => setIsCheckboxChecked(!isCheckboxChecked)}
              activeOpacity={0.8}
            >
              <View style={[styles.pdpaCheckboxBox, isCheckboxChecked && styles.pdpaCheckboxBoxActive]}>
                {isCheckboxChecked && <Text style={styles.pdpaCheckIcon}>✓</Text>}
              </View>
              <Text style={styles.pdpaLabelText}>{profileType === 'student' ? disclaimerData.checkboxLabelStudent : disclaimerData.checkboxLabel}</Text>
            </TouchableOpacity>

            {!!consentSubmitError && <Text style={styles.pdpaErrorText}>{consentSubmitError}</Text>}

            {/* Conditional Proceed Command Action */}
            <TouchableOpacity 
              style={[styles.pdpaSubmitButton, (!isCheckboxChecked || isSubmittingConsent) && styles.pdpaSubmitButtonDisabled]} 
              onPress={handleConsentAcceptance}
              disabled={!isCheckboxChecked || isSubmittingConsent}
            >
              <Text style={styles.pdpaSubmitButtonText}>{isSubmittingConsent ? 'Saving...' : 'I Consent and Agree'}</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

      <View style={styles.appBannerSection}>
        <Text style={styles.bannerHeaderTitle}>🏅 PSLE Tracker</Text>
        <View style={styles.roleToggleBarContainer}>
          <View style={[styles.roleSwitchButton, profileType === 'student' && styles.activeRoleSwitchBackground]}>
            <Text style={{ color: '#fff', fontWeight: 'bold' }}>🎒 Student</Text>
          </View>
          <View style={[styles.roleSwitchButton, profileType === 'parent' && styles.activeRoleSwitchBackground]}>
            <Text style={{ color: '#fff', fontWeight: 'bold' }}>👩‍👦 Parent</Text>
          </View>
        </View>
      </View>

      <View style={styles.countdownBar}>
        <Text style={styles.countdownText}>{countdownText}</Text>
      </View>

      {profileType === 'student' ? (
        studentLockStatus === null ? (
          <View style={styles.lockedContainer}>
            <ActivityIndicator size="large" color="#1abc9c" style={styles.loadingScreenSpinner} />
            <Text style={styles.lockedText}>Checking your account status…</Text>
          </View>
        ) : studentLockStatus.unlocked ? (
          <StudentDeck />
        ) : (
          <View style={styles.lockedContainer}>
            <Text style={styles.lockedTitle}>🔒 Waiting for Parent Consent</Text>
            <Text style={styles.lockedText}>
              {studentLockStatus.linked
                ? 'Your parent has registered your phone number but has not yet accepted the consent notice. Please ask them to open the app and accept it.'
                : `Ask your parent to register in the app using your phone number (${phone}) and accept the consent notice. Your account will unlock automatically once they do.`}
            </Text>
            <TouchableOpacity style={styles.lockedRefreshButton} onPress={() => setLockCheckTick(tick => tick + 1)}>
              <Text style={styles.lockedRefreshButtonText}>Refresh</Text>
            </TouchableOpacity>
          </View>
        )
      ) : <ParentDeck />}
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <AppProvider>
      <MainAppNavigator />
    </AppProvider>
  );
}

const styles = StyleSheet.create({
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 30, backgroundColor: '#2c3e50' },
  baseContainer: { flex: 1, backgroundColor: '#f8f9fa' },
  appBannerSection: { padding: 25, backgroundColor: '#2c3e50', paddingBottom: 20, paddingTop: 60, alignItems: 'center', borderBottomLeftRadius: 12, borderBottomRightRadius: 12 },
  bannerHeaderTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  roleToggleBarContainer: { flexDirection: 'row', backgroundColor: '#34495e', borderRadius: 8, padding: 4, marginTop: 14, width: '100%' },
  roleSwitchButton: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 6 },
  activeRoleSwitchBackground: { backgroundColor: '#1abc9c' },
  countdownBar: { backgroundColor: '#f1c40f', padding: 12, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#f39c12' },
  countdownText: { color: '#2c3e50', fontWeight: 'bold', fontSize: 13, letterSpacing: 0.5, textAlign: 'center' },

  // New PDPA Stylesheets
  pdpaContainer: { flex: 1, backgroundColor: '#ffffff' },
  pdpaHeader: { padding: 20, borderBottomWidth: 1, borderBottomColor: '#ecf0f1', backgroundColor: '#ffffff', alignItems: 'center' },
  pdpaTitleText: { fontSize: 15, fontWeight: 'bold', color: '#2c3e50', textAlign: 'center', lineHeight: 20 },
  pdpaScrollBody: { flex: 1 },
  pdpaScrollPadding: { padding: 20 },
  pdpaParentNoticeText: { fontSize: 13, lineHeight: 20, color: '#1abc9c', fontWeight: '600', backgroundColor: '#eafaf6', padding: 12, borderRadius: 8, marginBottom: 16 },
  pdpaIntroText: { fontSize: 14, lineHeight: 22, color: '#34495e', marginBottom: 18 },
  pdpaHeadingText: { fontSize: 14, fontWeight: 'bold', color: '#2c3e50', marginBottom: 12 },
  pdpaTermItemText: { fontSize: 13, lineHeight: 20, color: '#7f8c8d', marginBottom: 14, paddingLeft: 2 },
  pdpaFooterContainer: { padding: 20, borderTopWidth: 1, borderTopColor: '#ecf0f1', backgroundColor: '#ffffff' },
  pdpaCheckboxRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 20 },
  pdpaCheckboxBox: { width: 22, height: 22, borderWidth: 2, borderColor: '#bdc3c7', borderRadius: 4, justifyContent: 'center', alignItems: 'center', marginTop: 2, marginRight: 12, backgroundColor: '#ffffff' },
  pdpaCheckboxBoxActive: { backgroundColor: '#1abc9c', borderColor: '#1abc9c' },
  pdpaErrorText: { color: '#c0392b', fontSize: 12, marginBottom: 12, textAlign: 'center' },  pdpaCheckIcon: { color: '#ffffff', fontWeight: 'bold', fontSize: 14 },
  pdpaLabelText: { flex: 1, fontSize: 13, lineHeight: 18, color: '#34495e' },
  pdpaSubmitButton: { backgroundColor: '#1abc9c', paddingVertical: 16, borderRadius: 8, alignItems: 'center' },
  pdpaSubmitButtonDisabled: { backgroundColor: '#95a5a6' },
  pdpaSubmitButtonText: { color: '#ffffff', fontSize: 16, fontWeight: 'bold' },
  lockedContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 30 },
  lockedTitle: { fontSize: 18, fontWeight: 'bold', color: '#2c3e50', marginBottom: 12, textAlign: 'center' },
  lockedText: { fontSize: 14, lineHeight: 22, color: '#7f8c8d', textAlign: 'center' },
  lockedRefreshButton: { marginTop: 24, backgroundColor: '#1abc9c', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 8 },
  lockedRefreshButtonText: { color: '#ffffff', fontSize: 14, fontWeight: 'bold' },
  loadingScreenContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#ffffff', padding: 30 },
  loadingScreenTitle: { fontSize: 26, fontWeight: 'bold', color: '#1abc9c', marginBottom: 24 },
  loadingScreenSpinner: { marginVertical: 16 },
  loadingScreenText: { fontSize: 14, color: '#7f8c8d' }});