import React, { useState, useContext } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { AppContext } from '../context/AppContext';
import { validateSingaporePhone } from '../utils/validation';

export default function LoginView() {
  const { API_URL, setUserKey, setAppState, setProfileType, setAvatar, setAuthToken } = useContext(AppContext);
  const [inputPhone, setInputPhone] = useState('');
  const [loading, setLoading] = useState(false);

  const runAccountValidationCheck = async () => {
    if (!inputPhone) {
      Alert.alert('Missing Info', 'Please enter a mobile number.');
      return;
    }

    const cleanPhone = inputPhone.trim().replace(/[\s-]/g, '');

    setLoading(true);
    setAuthToken(null);
    try {
      if (!validateSingaporePhone(cleanPhone)) {
        Alert.alert('Invalid Mobile Number', 'Please enter a valid 8-digit Singapore phone number starting with 7, 8, or 9.');
        return;
      }

      const response = await fetch(`${API_URL}/auth/check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userKey: cleanPhone })
      });

      const data = await response.json();
      setUserKey(cleanPhone);

      if (data.exists) {
        setProfileType(data.role || data.defaultProfile || data.profileType || 'student');
        setAvatar(data.avatar || null);
        const statusResponse = await fetch(`${API_URL}/auth/pin/status`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userKey: cleanPhone })
        });
        const statusData = await statusResponse.json();
        setAppState(statusData.pinSet ? 'pin-verify' : 'pin-setup');
      } else {
        setAppState('onboarding');
      }
    } catch (error) {
      Alert.alert('Connection Error', 'Unable to reach backend gateway pipeline.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.card}>
      <Text style={styles.title}>PSLE Tracker</Text>
      <Text style={styles.subtitle}>Enter mobile contact to create profile</Text>
      <TextInput
        style={styles.input}
        placeholder="E.g., 91234567"
        placeholderTextColor="#95a5a6"
        keyboardType="phone-pad"
        maxLength={11}
        value={inputPhone}
        onChangeText={setInputPhone}
      />
      <TouchableOpacity style={styles.btn} onPress={runAccountValidationCheck} disabled={loading}>
        {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.btnText}>Access Profile</Text>}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#FFF', borderRadius: 12, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3, width: '90%', maxWidth: 400, alignSelf: 'center', marginTop: '30%' },
  title: { fontSize: 22, fontWeight: '800', color: '#1F2937', textAlign: 'center', marginBottom: 4 },
  subtitle: { fontSize: 13, color: '#6B7280', textAlign: 'center', marginBottom: 20 },
  input: { backgroundColor: '#fff', width: '100%', padding: 14, borderRadius: 8, fontSize: 16, color: '#2c3e50', marginBottom: 20, textAlign: 'center', fontWeight: 'bold', borderWidth: 1, borderColor: '#d5dbdb' },
  btn: { backgroundColor: '#1abc9c', padding: 14, borderRadius: 8, alignItems: 'center' },
  btnText: { color: '#FFF', fontSize: 15, fontWeight: '700' }
});
