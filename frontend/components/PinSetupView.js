import React, { useState, useContext } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { AppContext } from '../context/AppContext';

export default function PinSetupView() {
  const { API_URL, userKey, setAppState, setAuthToken } = useContext(AppContext);
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!/^\d{6}$/.test(pin) || !/^\d{6}$/.test(confirmPin)) {
      Alert.alert('Invalid PIN', 'Please enter a 6-digit PIN in both fields.');
      return;
    }
    if (pin !== confirmPin) {
      Alert.alert('PIN Mismatch', 'The two PINs you entered do not match.');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`${API_URL}/auth/pin/setup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userKey, pin, confirmPin })
      });
      const data = await response.json();
      if (!response.ok) {
        Alert.alert('Could Not Save PIN', data.error || 'Please try again.');
        return;
      }
      if (data.sessionId) setAuthToken(data.sessionId);
      setAppState('dashboard');
    } catch (error) {
      Alert.alert('Connection Error', 'Unable to reach backend gateway pipeline.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Set Up Your PIN</Text>
      <Text style={styles.subtitle}>Choose a 6-digit PIN to protect this account. You will need it every time you log in.</Text>
      <TextInput
        style={styles.input}
        placeholder="Enter 6-digit PIN"
        placeholderTextColor="#95a5a6"
        keyboardType="number-pad"
        secureTextEntry
        maxLength={6}
        value={pin}
        onChangeText={value => setPin(value.replace(/[^0-9]/g, ''))}
      />
      <TextInput
        style={styles.input}
        placeholder="Re-enter PIN to confirm"
        placeholderTextColor="#95a5a6"
        keyboardType="number-pad"
        secureTextEntry
        maxLength={6}
        value={confirmPin}
        onChangeText={value => setConfirmPin(value.replace(/[^0-9]/g, ''))}
      />
      <TouchableOpacity style={styles.btn} onPress={handleSubmit} disabled={submitting}>
        {submitting ? <ActivityIndicator color="#FFF" /> : <Text style={styles.btnText}>Save PIN</Text>}
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
  btnText: { color: '#FFF', fontSize: 15, fontWeight: '700' }
});
