import React, { useState, useEffect, useContext } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Alert, ActivityIndicator, TextInput, Image } from 'react-native';
import { Checkbox } from 'react-native-paper';
import { AppContext } from '../context/AppContext';
import { getAvatarsForRole } from '../utils/avatarConfig';
import { validateSingaporePhone } from '../utils/validation';

export default function OnboardingView() {
  const { API_URL, userKey, setAppState, profileType, setProfileType, setAvatar, setAuthToken } = useContext(AppContext);
  const [loading, setLoading] = useState(true);
  const [syllabus, setSyllabus] = useState([]);
  const [selectedTopics, setSelectedTopics] = useState({});
  const [expandedSubject, setExpandedSubject] = useState('Science');
  const [submitting, setSubmitting] = useState(false);
  const [selectedRole, setSelectedRole] = useState(profileType === 'parent' ? 'parent' : 'student');
  const [studentPhone, setStudentPhone] = useState('');
  const [selectedAvatarId, setSelectedAvatarId] = useState(getAvatarsForRole(selectedRole)[0].id);

  useEffect(() => {
    fetch(`${API_URL}/syllabus`)
      .then(res => res.json())
      .then(data => {
        setSyllabus(data);
        const initial = {};
        data.forEach(item => { initial[item.id] = true; });
        setSelectedTopics(initial);
        setLoading(false);
      })
      .catch(() => {
        Alert.alert('Error', 'Failed to retrieve curriculum framework mappings.');
        setLoading(false);
      });
  }, [API_URL]);

  const toggleTopic = (id) => {
    setSelectedTopics(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleRoleChange = (role) => {
    setSelectedRole(role);
    setSelectedAvatarId(getAvatarsForRole(role)[0].id);
  };

  const handleRegister = async () => {
    if (!userKey) {
      Alert.alert('Session Error', 'Please re-enter your mobile number.');
      setAppState('login');
      return;
    }

    const chosenTopics = syllabus.filter(item => selectedTopics[item.id]);
    if (chosenTopics.length === 0) {
      Alert.alert('Configuration Error', 'Select at least 1 tracking module to build database dependencies.');
      return;
    }
    const cleanStudentPhone = studentPhone.trim().replace(/[\s-]/g, '');
    if (selectedRole === 'parent') {
      if (!cleanStudentPhone) {
        Alert.alert('Missing Student Number', 'Enter the student mobile number to continue parent onboarding.');
        return;
      }
      if (!validateSingaporePhone(cleanStudentPhone)) {
        Alert.alert('Invalid Student Number', 'Enter the student\'s 8-digit Singapore mobile number exactly as they will use to log in (starting with 7, 8, or 9).');
        return;
      }
      if (cleanStudentPhone === userKey.trim()) {
        Alert.alert('Invalid Link', 'Parent and student numbers must be different.');
        return;
      }
    }

    setSubmitting(true);
    try {
      const response = await fetch(`${API_URL}/auth/onboard`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userKey, role: selectedRole, selectedTopics: chosenTopics, studentUserKey: selectedRole === 'parent' ? cleanStudentPhone : undefined, avatar: selectedAvatarId })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.sessionId) setAuthToken(data.sessionId);
        setProfileType(selectedRole);
        setAvatar(selectedAvatarId);
        setAppState('pin-setup');
      } else {
        const errorData = await response.json().catch(() => null);
        Alert.alert('Error', errorData?.error || `Could not activate the selected learning path. (${response.status})`);
      }
    } catch (e) {
      Alert.alert('Error', 'Could not seed user configuration rows.');
    } finally {
      setSubmitting(false);
    }
  };

  const groupedSyllabus = syllabus.reduce((groups, item) => {
    if (!groups[item.subject]) groups[item.subject] = [];
    groups[item.subject].push(item);
    return groups;
  }, {});

  if (loading) return <ActivityIndicator style={{ marginTop: 40 }} size="large" color="#4F46E5" />;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.banner}>
        <Text style={styles.bannerTitle}>Syllabus Core Activation</Text>
      </View>

      <View style={styles.rolePickerSection}>
        <Text style={styles.rolePickerTitle}>Who are you?</Text>
        <View style={styles.rolePickerRow}>
          <TouchableOpacity
            style={[styles.roleOption, selectedRole === 'parent' && styles.roleOptionSelected]}
            onPress={() => handleRoleChange('parent')}
          >
            <Text style={[styles.roleOptionText, selectedRole === 'parent' && styles.roleOptionTextSelected]}>Parent</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.roleOption, selectedRole === 'student' && styles.roleOptionSelected]}
            onPress={() => handleRoleChange('student')}
          >
            <Text style={[styles.roleOptionText, selectedRole === 'student' && styles.roleOptionTextSelected]}>Student</Text>
          </TouchableOpacity>
        </View>
        {selectedRole === 'parent' && (
          <TextInput
            style={styles.studentPhoneInput}
            placeholder="Student phone number (required)"
            placeholderTextColor="#95a5a6"
            keyboardType="phone-pad"
            maxLength={11}
            value={studentPhone}
            onChangeText={setStudentPhone}
          />
        )}
      </View>

      <View style={styles.avatarPickerSection}>
        <Text style={styles.rolePickerTitle}>Pick Your Avatar</Text>
        <View style={styles.avatarGrid}>
          {getAvatarsForRole(selectedRole).map(avatarItem => (
            <TouchableOpacity
              key={avatarItem.id}
              style={[styles.avatarOption, selectedAvatarId === avatarItem.id && styles.avatarOptionSelected]}
              onPress={() => setSelectedAvatarId(avatarItem.id)}
            >
              <Image source={avatarItem.source} style={styles.avatarImage} />
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.workspace}>
        {Object.entries(groupedSyllabus).map(([subject, topics]) => (
          <View key={subject} style={styles.subjectGroup}>
            <TouchableOpacity style={[styles.subjectHeader, expandedSubject === subject && styles.subjectHeaderActive]} onPress={() => setExpandedSubject(expandedSubject === subject ? null : subject)}>
              <Text style={styles.subjectHeaderText}>{subject}</Text>
            </TouchableOpacity>
            {expandedSubject === subject && (
              <View style={styles.topicContainer}>
                {topics.map(item => (
                  <TouchableOpacity key={item.id} style={styles.topicRow} onPress={() => toggleTopic(item.id)}>
                    <Checkbox status={selectedTopics[item.id] ? 'checked' : 'unchecked'} color="#1abc9c" />
                    <Text style={styles.name}>{item.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        ))}
        <TouchableOpacity style={styles.submitBtn} onPress={handleRegister} disabled={submitting}>
          {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>🚀 Activate Core & Open Dashboard</Text>}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  content: { paddingBottom: 24 },
  banner: { padding: 25, backgroundColor: '#2c3e50', paddingBottom: 20, paddingTop: 35, alignItems: 'center', borderBottomLeftRadius: 12, borderBottomRightRadius: 12 },
  bannerTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  rolePickerSection: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  rolePickerTitle: { fontSize: 16, fontWeight: '700', color: '#1F2937', marginBottom: 10 },
  rolePickerRow: { flexDirection: 'row', gap: 10 },
  roleOption: { flex: 1, paddingVertical: 12, borderRadius: 8, backgroundColor: '#E5E7EB', alignItems: 'center', borderWidth: 1, borderColor: '#D1D5DB' },
  roleOptionSelected: { backgroundColor: '#D1FAE5', borderColor: '#10B981' },
  roleOptionText: { color: '#374151', fontWeight: '700' },
  roleOptionTextSelected: { color: '#065F46' },
  studentPhoneInput: { backgroundColor: '#fff', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#D1D5DB', marginTop: 12, color: '#1F2937' },
  avatarPickerSection: { paddingHorizontal: 16, paddingBottom: 8 },
  avatarGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  avatarOption: { width: 72, height: 72, borderRadius: 12, borderWidth: 3, borderColor: 'transparent', overflow: 'hidden', backgroundColor: '#f3f4f6' },
  avatarOptionSelected: { borderColor: '#1abc9c' },
  avatarImage: { width: '100%', height: '100%' },
  workspace: { padding: 16 },
  subjectGroup: { marginBottom: 8 },
  subjectHeader: { backgroundColor: '#34495e', padding: 14, borderRadius: 8 },
  subjectHeaderActive: { backgroundColor: '#2c3e50' },
  subjectHeaderText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  topicContainer: { backgroundColor: '#fdfefe', padding: 10, borderBottomWidth: 1, borderBottomColor: '#bdc3c7' },
  topicRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 12, borderRadius: 8, marginBottom: 8, elevation: 1 },
  name: { fontSize: 14, color: '#1F2937', marginTop: 2 },
  submitBtn: { backgroundColor: '#1abc9c', padding: 15, borderRadius: 8, alignItems: 'center', marginTop: 12 },
  submitBtnText: { color: '#FFF', fontWeight: '700', fontSize: 15 }
});
