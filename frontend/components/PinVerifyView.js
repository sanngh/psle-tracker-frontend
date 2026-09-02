import React, { useState, useContext, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { AppContext } from '../context/AppContext';

export default function PinVerifyView() {
  const { API_URL, userKey, setAppState, setUserKey, setAuthToken } = useContext(AppContext);
  const [pin, setPin] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [locked, setLocked] = useState(false);
  const [attemptsRemaining, setAttemptsRemaining] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const checkStatus = async () => {
      try {
        const response = await fetch(`${API_URL}/auth/pin/status`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userKey })
        });
        const data = await response.json();
        if (!cancelled) setLocked(Boolean(data.locked));
      } catch (error) {
        console.error('Error checking PIN lock status:', error);
      } finally {
        if (!cancelled) setCheckingStatus(false);
      }
    };
    checkStatus();
    return () => { cancelled = true; };
  }, [API_URL, userKey]);

  const handleSubmit = async () => {
    if (!/^\d{6}$/.test(pin)) {
      Alert.alert('Invalid PIN', 'Please enter your 6-digit PIN.');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`${API_URL}/auth/pin/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userKey, pin })
      });
      const data = await response.json();
      if (response.ok && data.success) {
        if (data.sessionId) setAuthToken(data.sessionId);
        setAppState('dashboard');
        return;
      }
      if (data.locked) {
        setLocked(true);
      } else {
        setAttemptsRemaining(typeof data.attemptsRemaining === 'number' ? data.attemptsRemaining : null);
        Alert.alert('Incorrect PIN', typeof data.attemptsRemaining === 'number' ? `Incorrect PIN. ${data.attemptsRemaining} attempt(s) remaining.` : 'Incorrect PIN.');
      }
      setPin('');
    } catch (error) {
      Alert.alert('Connection Error', 'Unable to reach backend gateway pipeline.');
    } finally {
      setSubmitting(false);
    }
  };

  if (checkingStatus) {
    return <ActivityIndicator style={{ marginTop: 60 }} size="large" color="#1abc9c" />;
  }

  if (locked) {
    return (
      <View style={styles.card}>
        <Text style={styles.title}>🔒 Account Locked</Text>
        <Text style={styles.subtitle}>Too many incorrect PIN attempts. Ask your linked parent or student to unlock this account from their dashboard.</Text>
        <TouchableOpacity style={styles.secondaryBtn} onPress={() => { setAuthToken(null); setUserKey(''); setAppState('login'); }}>
          <Text style={styles.secondaryBtnText}>Back to Login</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Enter Your PIN</Text>
      <Text style={styles.subtitle}>{attemptsRemaining !== null ? `${attemptsRemaining} attempt(s) remaining.` : 'Enter your 6-digit PIN to continue.'}</Text>
      <TextInput
        style={styles.input}
        placeholder="6-digit PIN"
        placeholderTextColor="#95a5a6"
        keyboardType="number-pad"
        secureTextEntry
        maxLength={6}
        value={pin}
        onChangeText={value => setPin(value.replace(/[^0-9]/g, ''))}
      />
      <TouchableOpacity style={styles.btn} onPress={handleSubmit} disabled={submitting}>
        {submitting ? <ActivityIndicator color="#FFF" /> : <Text style={styles.btnText}>Unlock Dashboard</Text>}
      </TouchableOpacity>
      <TouchableOpacity style={styles.secondaryBtn} onPress={() => { setAuthToken(null); setUserKey(''); setAppState('login'); }}>
        <Text style={styles.secondaryBtnText}>Use a Different Number</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#FFF', borderRadius: 12, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3, width: '90%', maxWidth: 400, alignSelf: 'center', marginTop: '25%' },
  title: { fontSize: 22, fontWeight: '800', color: '#1F2937', textAlign: 'center', marginBottom: 4 },
  subtitle: { fontSize: 13, color: '#6B7280', textAlign: 'center', marginBottom: 20 },
  input: { backgroundColor: '#fff', width: '100%', padding: 14, borderRadius: 8, fontSize: 20, letterSpacing: 8, color: '#2c3e50', marginBottom: 14, textAlign: 'center', fontWeight: 'bold', borderWidth: 1, borderColor: '#d5dbdb' },
  btn: { backgroundColor: '#1abc9c', padding: 14, borderRadius: 8, alignItems: 'center', marginTop: 6 },
  btnText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
  secondaryBtn: { marginTop: 14, alignItems: 'center' },
  secondaryBtnText: { color: '#7f8c8d', fontSize: 13, fontWeight: '600' }
});
