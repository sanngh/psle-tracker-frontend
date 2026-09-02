import React, { useState, useEffect, useContext } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AppContext } from '../context/AppContext';

export default function StatusBanner() {
  const { userKey, profileType } = useContext(AppContext);
  const [countdown, setCountdown] = useState('');

  useEffect(() => {
    const calculateTimeLeft = () => {
      const difference = +new Date('2026-09-24T08:15:00+08:00') - +new Date();
      if (difference <= 0) {
        setCountdown('PSLE 2026 Examination is underway!');
        return;
      }
      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
      const mins = Math.floor((difference / 1000 / 60) % 60);
      setCountdown(`${days}d ${hours}h ${mins}m to Written Papers`);
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 60000);
    return () => clearInterval(timer);
  }, []);

  return (
    <View style={styles.banner}>
      <Text style={styles.countdownText}>⏱️ {countdown}</Text>
      <Text style={styles.profileText}>
        Logged as: <Text style={styles.bold}>{userKey || 'Unknown user'}</Text> ({(profileType || 'student').toUpperCase()})
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: { backgroundColor: '#2c3e50', padding: 12, alignItems: 'center', justifyContent: 'center' },
  countdownText: { color: '#f1c40f', fontSize: 14, fontWeight: '700', marginBottom: 2 },
  profileText: { color: '#E0E7FF', fontSize: 11 },
  bold: { fontWeight: '700' }
});
