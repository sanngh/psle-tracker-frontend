import React, { useState, useContext } from 'react';
import { StyleSheet, Text, View, ScrollView, FlatList, TouchableOpacity, TextInput, Alert, ActivityIndicator, Image, Modal } from 'react-native';
import { AppContext } from '../context/AppContext';
import { REVISION_LEVELS } from '../appConfig';
import { getAvatarSource } from '../utils/avatarConfig';
import AvatarPicker from '../components/AvatarPicker';
import { validateSingaporePhone } from '../utils/validation';
import MetricsChartsTab, { resolveALGrade } from '../components/MetricsChartsTab';
import PrelimsExamTab from '../components/PrelimsExamTab';
const { filterAssignmentRows, normalizeSubject, uniqueRowsByNameAndSubject } = require('../utils/assignmentData');

const subjectOptions = ['Science', 'Mathematics', 'English'];
const revisionLevelOptions = REVISION_LEVELS.length > 0 ? REVISION_LEVELS : ['P4', 'P5', 'P6'];
const monthOptions = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October'];

export default function ParentDeck() {
  const { API_URL, userKey, avatar, setAvatar, dashboardData, refreshData, setAuthToken } = useContext(AppContext);
  const [isAvatarPickerOpen, setIsAvatarPickerOpen] = useState(false);
  const [isAvatarLabelVisible, setIsAvatarLabelVisible] = useState(false);
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [feedbackForm, setFeedbackForm] = useState({ subject: 'Science', source: 'School', score: '', remarks: '' });
  const [activeFeedbackTab, setActiveFeedbackTab] = useState('Log');
  const [chartType, setChartType] = useState('Bar');
  const [feedbackSource, setFeedbackSource] = useState('School');
  const [selectedFeedbackSubject, setSelectedFeedbackSubject] = useState('Science');
  const [selectedExamSubject, setSelectedExamSubject] = useState('Science');
  const [selectedRevisionSubject, setSelectedRevisionSubject] = useState('Science');
  const [selectedFeedbackMonth, setSelectedFeedbackMonth] = useState('January');
  const [feedbackRating, setFeedbackRating] = useState('');
  const [feedbackNotes, setFeedbackNotes] = useState('');
  const [isParentDrawerOpen, setIsParentDrawerOpen] = useState(false);
  const [isParentSyllabusDrawerOpen, setIsParentSyllabusDrawerOpen] = useState(false);
  const [isAnalyticsDrawerOpen, setIsAnalyticsDrawerOpen] = useState(false);
  const [isRevisionDrawerOpen, setIsRevisionDrawerOpen] = useState(false);
  const [isCustomRevisionFormOpen, setIsCustomRevisionFormOpen] = useState(false);
  const [isExamAssignmentDrawerOpen, setIsExamAssignmentDrawerOpen] = useState(false);
  const [isCustomExamFormOpen, setIsCustomExamFormOpen] = useState(false);
  const [expandedMistakeTitle, setExpandedMistakeTitle] = useState(null);
  const [customExamName, setCustomExamName] = useState('');
  const [customExamSubject, setCustomExamSubject] = useState('Science');
  const [customRevisionName, setCustomRevisionName] = useState('');
  const [customRevisionSubject, setCustomRevisionSubject] = useState('Science');
  const [customRevisionLevel, setCustomRevisionLevel] = useState('P6');
  const [childPhoneInput, setChildPhoneInput] = useState('');
  const [linkedChildren, setLinkedChildren] = useState([]);
  const [isLinkFormOpen, setIsLinkFormOpen] = useState(false);
  const [showLinkedChildPhone, setShowLinkedChildPhone] = useState(false);

  const refreshLinkedChildren = async () => {
    if (!userKey) return;
    try {
      const res = await fetch(`${API_URL}/links/children`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userKey: userKey.trim() })
      });
      if (!res.ok) return;
      const children = await res.json();
      setLinkedChildren(children || []);
    } catch (error) {
      console.error('Failed to load linked children', error);
    }
  };

  React.useEffect(() => {
    refreshLinkedChildren();
    const intervalId = setInterval(refreshLinkedChildren, 10000);
    return () => clearInterval(intervalId);
  }, [API_URL, userKey]);

  const handleUnlockAccount = async (targetPhone) => {
    try {
      const res = await fetch(`${API_URL}/auth/pin/unlock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requesterUserKey: userKey, targetUserKey: targetPhone })
      });
      const data = await res.json();
      if (!res.ok) {
        Alert.alert('Unlock Failed', data.error || 'Could not unlock this account.');
        return;
      }
      Alert.alert('Unlocked', 'The account has been unlocked. They can now log in with their PIN.');
      await refreshLinkedChildren();
    } catch (error) {
      Alert.alert('Connection Error', 'Unable to reach backend gateway pipeline.');
    }
  };

  const handleChangeAvatar = async (avatarId) => {
    try {
      const res = await fetch(`${API_URL}/profile/avatar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userKey, avatar: avatarId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Unable to update avatar.');
      setAvatar(avatarId);
      setIsAvatarPickerOpen(false);
    } catch (error) {
      Alert.alert('Update Failed', error.message || 'Could not save your new avatar.');
    }
  };

  if (!dashboardData) {
    return <ActivityIndicator style={{ marginTop: 40 }} size="large" color="#4F46E5" />;
  }

  const alerts = dashboardData.alerts || dashboardData.notifications || [];
  const examRows = dashboardData.exams || [];
  const revisionTopics = dashboardData.revisionTopics || [];
  const uniqueExamRows = uniqueRowsByNameAndSubject(examRows);
  const uniqueRevisionTopics = uniqueRowsByNameAndSubject(revisionTopics);
  const assignmentExamRows = uniqueExamRows;
  const assignmentRevisionTopics = uniqueRevisionTopics;
  const assignableRevisionTopics = filterAssignmentRows(assignmentRevisionTopics, selectedRevisionSubject);
  const assignableExamRows = filterAssignmentRows(assignmentExamRows, selectedExamSubject);

  // Averages every completed prelim paper's percentage per subject, then derives one AL grade from that average.
  const completedExamRows = uniqueExamRows.filter(exam => String(exam.status || '').trim() === 'Completed' && Number.isFinite(Number(exam.totalScore)) && Number(exam.totalScore) > 0);
  const subjectExamStats = subjectOptions.map(subject => {
    const subjectExams = completedExamRows
      .filter(exam => normalizeSubject(exam.subject) === normalizeSubject(subject))
      .slice()
      .sort((first, second) => new Date(first.completionDate || 0) - new Date(second.completionDate || 0));
    const percentages = subjectExams.map(exam => (Number(exam.score) / Number(exam.totalScore)) * 100);
    const averagePercentage = percentages.length > 0 ? percentages.reduce((total, pct) => total + pct, 0) / percentages.length : null;
    return {
      subject,
      papers: subjectExams,
      averagePercentage,
      alGrade: averagePercentage !== null ? resolveALGrade(averagePercentage) : null
    };
  });
  const mistakeRows = dashboardData.mistakes || [];
  const feedbackRows = dashboardData.feedback || [];
  const isRevisionSeason = new Date().getMonth() >= 5;

  const topicCoverage = subjectOptions.reduce((coverage, subject) => {
    const subjectKey = subject.toLowerCase();
    const syllabusTopics = (dashboardData.syllabusProgress || []).filter(topic => (topic.subject || '').trim().toLowerCase() === subjectKey);
    const revisionRows = revisionTopics.filter(topic => (topic.subject || '').trim().toLowerCase() === subjectKey);
    coverage[subject] = {
      syllabusCovered: syllabusTopics.filter(topic => Number(topic.progress) > 0).length,
      syllabusTotal: syllabusTopics.length,
      revisionCovered: revisionRows.filter(topic => Number(topic.progress) > 0).length,
      revisionTotal: revisionRows.length
    };
    return coverage;
  }, {});

  const handleDismissNotification = async (id, type) => {
    try {
      const route = type === 'syllabus' ? 'syllabus/dismiss-alert' : (type === 'revision' ? 'revisions/dismiss-alert' : 'exams/dismiss-alert');
      const res = await fetch(`${API_URL}/${route}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, userKey: userKey.trim() })
      });
      if (res.ok) refreshData();
    } catch (e) { console.error(e); }
  };

  const handleDismissAllNotifications = async () => {
    try {
      const res = await fetch(`${API_URL}/alerts/dismiss-all`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userKey: userKey.trim() })
      });
      if (res.ok) refreshData();
    } catch (e) { console.error(e); }
  };

  const handleAssignExam = async (examId) => {
    try {
      const res = await fetch(`${API_URL}/exams/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: examId, userKey })
      });
      if (res.ok) {
        Alert.alert('Success', 'Exam profile successfully assigned to child.');
        refreshData();
      }
    } catch (e) { console.error(e); }
  };

  const handleAssignRevision = async (revisionId) => {
    try {
      const res = await fetch(`${API_URL}/revisions/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: revisionId, userKey: userKey.trim() })
      });
      if (res.ok) {
        Alert.alert('Revision Assigned', 'Revision topic is now visible in the student view.');
        refreshData();
      }
    } catch (e) { console.error(e); }
  };

  const handleAddCustomExam = async () => {
    if (!customExamName.trim() || !customExamSubject.trim()) {
      Alert.alert('Missing Data', 'Please enter an exam name and choose a subject.');
      return;
    }

    try {
      const res = await fetch(`${API_URL}/exams/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userKey: userKey.trim(), name: customExamName.trim(), subject: customExamSubject })
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result?.error || 'Unable to add exam.');
      Alert.alert('Exam Added', 'The new prelim paper is now available for the child.');
      setCustomExamName('');
      setCustomExamSubject('Science');
      refreshData();
    } catch (e) {
      console.error(e);
      Alert.alert('Add Failed', e.message || 'Unable to add exam right now.');
    }
  };

  const handleAddCustomRevision = async () => {
    if (!customRevisionName.trim() || !customRevisionSubject.trim()) {
      Alert.alert('Missing Data', 'Please enter a revision item name and choose a subject.');
      return;
    }

    try {
      const res = await fetch(`${API_URL}/revisions/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userKey: userKey.trim(), name: customRevisionName.trim(), subject: customRevisionSubject, level: customRevisionLevel.trim() || 'P6' })
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result?.error || 'Unable to add revision item.');
      Alert.alert('Revision Added', 'The new revision item is now available for the child.');
      setCustomRevisionName('');
      setCustomRevisionSubject('Science');
      setCustomRevisionLevel('P6');
      refreshData();
    } catch (e) {
      console.error(e);
      Alert.alert('Add Failed', e.message || 'Unable to add revision item right now.');
    }
  };

  const handleLinkChild = async () => {
    const cleanStudentPhone = childPhoneInput.trim().replace(/[\s-]/g, '');
    if (!cleanStudentPhone) {
      Alert.alert('Missing Info', 'Enter the student phone number to link.');
      return;
    }
    if (!validateSingaporePhone(cleanStudentPhone)) {
      Alert.alert('Invalid Student Number', 'Enter the student\'s 8-digit Singapore mobile number exactly as they will use to log in (starting with 7, 8, or 9).');
      return;
    }

    try {
      const res = await fetch(`${API_URL}/links/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parentUserKey: userKey.trim(), studentUserKey: cleanStudentPhone })
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result?.error || 'Unable to link student.');
      // Linking mints a fresh session for this parent phone, so update our own stored
      // token or every request right after this would fail with a stale-session 401.
      const refreshedToken = result?.sessions?.[userKey.trim()];
      if (refreshedToken) setAuthToken(refreshedToken);
      Alert.alert('Linked', 'Student account is now linked to this parent profile.');
      setChildPhoneInput('');
      await refreshLinkedChildren();
      await refreshData();
    } catch (e) {
      console.error(e);
      Alert.alert('Link Failed', e.message || 'Unable to link to the student account.');
    }
  };

  const handleSaveFeedback = async () => {
    if (!feedbackForm.source || !feedbackForm.score || !feedbackForm.remarks) {
      Alert.alert('Error', 'Complete all performance analytics inputs.');
      return;
    }
    setSubmittingFeedback(true);
    try {
      const res = await fetch(`${API_URL}/feedback/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userKey,
          subject: feedbackForm.subject,
          source: feedbackForm.source,
          month: selectedFeedbackMonth,
          remarks: feedbackForm.remarks,
          score: parseFloat(feedbackForm.score)
        })
      });
      if (res.ok) {
        Alert.alert('Success', 'Report compiled.');
        setFeedbackForm({ subject: 'Science', source: 'School', score: '', remarks: '' });
        setIsParentDrawerOpen(false);
        refreshData();
      }
    } catch (e) { console.error(e); }
    finally { setSubmittingFeedback(false); }
  };

  const handleSaveMonthlyFeedback = async () => {
    if (!feedbackRating.trim() || !feedbackNotes.trim()) {
      Alert.alert('Missing Input', 'Fields required.');
      return;
    }

    try {
      const response = await fetch(`${API_URL}/feedback/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userKey,
          subject: selectedFeedbackSubject,
          source: feedbackSource,
          month: selectedFeedbackMonth,
          remarks: feedbackNotes.trim(),
          score: parseInt(feedbackRating, 10)
        })
      });
      if (response.ok) {
        Alert.alert('Feedback Recorded', 'Teacher evaluation logged.');
        setFeedbackRating('');
        setFeedbackNotes('');
        refreshData();
      }
    } catch (e) { console.error(e); }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ padding: 16 }}
      scrollEnabled={!isRevisionDrawerOpen && !isExamAssignmentDrawerOpen}
      nestedScrollEnabled
      keyboardShouldPersistTaps="handled"
    >
      <AvatarPicker
        visible={isAvatarPickerOpen}
        role="parent"
        currentAvatarId={avatar}
        onSelect={handleChangeAvatar}
        onClose={() => setIsAvatarPickerOpen(false)}
      />
      <View style={{ backgroundColor: '#eef7ff', borderWidth: 1, borderColor: '#bfdbfe', borderRadius: 10, padding: 12, marginBottom: 12 }}>
        <View style={[styles.profileRow, { marginBottom: isLinkFormOpen || linkedChildren.length > 0 ? 10 : 0 }]}>
          <TouchableOpacity
            onPress={() => setIsAvatarPickerOpen(true)}
            onPressIn={() => setIsAvatarLabelVisible(true)}
            onPressOut={() => setIsAvatarLabelVisible(false)}
            activeOpacity={0.8}
          >
            <Image source={getAvatarSource('parent', avatar)} style={styles.avatarBarImage} />
          </TouchableOpacity>
          <TouchableOpacity activeOpacity={0.8} onPress={() => setIsLinkFormOpen(prev => !prev)} style={styles.profileTextCol}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: '#1d4ed8' }}>👨‍👩‍👧 Link Student Account</Text>
            {isAvatarLabelVisible && <Text style={styles.avatarBarText}>Tap your avatar to change it</Text>}
          </TouchableOpacity>
        </View>

        {linkedChildren.map(child => (
          <View key={child.student_phone} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <TouchableOpacity activeOpacity={0.7} onPress={() => setShowLinkedChildPhone(prev => !prev)} style={{ flex: 1 }}>
              <Text style={{ color: '#374151', fontSize: 12 }}>
                🎒 {showLinkedChildPhone ? child.student_phone : 'Tap to reveal student contact'}{child.locked ? ' — 🔒 Locked' : ''}
              </Text>
            </TouchableOpacity>
            {child.locked && (
              <TouchableOpacity style={{ backgroundColor: '#1abc9c', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 6 }} onPress={() => handleUnlockAccount(child.student_phone)}>
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 11 }}>Unlock</Text>
              </TouchableOpacity>
            )}
          </View>
        ))}

        {isLinkFormOpen && (
          <>
            <TextInput
              style={[styles.input, { marginBottom: 8 }]}
              placeholder="Enter student phone number"
              value={childPhoneInput}
              onChangeText={setChildPhoneInput}
              keyboardType="phone-pad"
              maxLength={11}
            />
            <TouchableOpacity style={styles.btn} onPress={handleLinkChild}>
              <Text style={{ color: '#fff', fontWeight: '700' }}>Link Child</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      {alerts?.map(n => (
        <View key={`${n.type}-${n.id}`} style={[styles.alert, { backgroundColor: '#e8f8f5', borderColor: '#2ecc71', borderWidth: 1 }]}> 
          <Text style={{ color: '#155724', flex: 1, fontWeight: '600', fontSize: 11 }}>{n.message}</Text>
          <TouchableOpacity onPress={() => handleDismissNotification(n.id, n.type)}>
            <Text style={{ fontWeight: '700', color: '#155724' }}>✕</Text>
          </TouchableOpacity>
        </View>
      ))}
      {alerts.length > 0 && (
        <TouchableOpacity style={{ backgroundColor: '#e74c3c', padding: 10, borderRadius: 6, alignItems: 'center', marginBottom: 8 }} onPress={handleDismissAllNotifications}>
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 11 }}>✕ Dismiss All Alerts</Text>
        </TouchableOpacity>
      )}

      <Text style={styles.heading}>🚨 System Diagnostics Warnings</Text>

      <View style={{ flexDirection: 'row', gap: 8, marginVertical: 6 }}>
        <TouchableOpacity style={{ backgroundColor: '#34495e', padding: 12, borderRadius: 8, flex: 1, alignItems: 'center', borderWidth: 1, borderColor: '#bdc3c7' }} onPress={() => { setFeedbackSource('School'); refreshData(); setIsParentDrawerOpen(true); }}>
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 11 }}>📊 Open Feedback & Charts</Text>
        </TouchableOpacity>
      </View>
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
        <TouchableOpacity style={{ backgroundColor: '#2c3e50', padding: 12, borderRadius: 8, flex: 1, alignItems: 'center', borderWidth: 1, borderColor: '#9b59b6' }} onPress={() => { setSelectedFeedbackSubject('Science'); refreshData(); setIsParentSyllabusDrawerOpen(true); }}>
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 8 }}>📐 View Syllabus Topics Track</Text>
        </TouchableOpacity>
        <TouchableOpacity style={{ backgroundColor: '#2c3e50', padding: 12, borderRadius: 8, flex: 1, alignItems: 'center', borderWidth: 1, borderColor: '#9b59b6' }} onPress={() => { refreshData(); setIsAnalyticsDrawerOpen(true); }}>
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 8 }}>📈 View Subject Analytics</Text>
        </TouchableOpacity>
      </View>
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
        {isRevisionSeason && (
          <TouchableOpacity style={styles.assignmentButton} onPress={() => { refreshData(); setIsCustomRevisionFormOpen(false); setIsRevisionDrawerOpen(true); }}>
            <Text style={styles.assignmentButtonText}>🔁 Assign Revision Topics</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.assignmentButton} onPress={() => { refreshData(); setIsCustomExamFormOpen(false); setIsExamAssignmentDrawerOpen(true); }}>
          <Text style={styles.assignmentButtonText}>📊 Assign Prelims Exam Papers</Text>
        </TouchableOpacity>
      </View>

      {isExamAssignmentDrawerOpen && (
        <Modal visible transparent animationType="slide" onRequestClose={() => setIsExamAssignmentDrawerOpen(false)}>
          <View style={styles.overlay}>
          <View style={[styles.drawerLarge, styles.assignmentDrawer]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 15 }}>
              <Text style={{ flex: 1, marginRight: 10, fontSize: 15, fontWeight: '700', color: '#2c3e50' }}>📊 Prelims Exam Performance Assignment Board ({selectedExamSubject})</Text>
              <TouchableOpacity onPress={() => setIsExamAssignmentDrawerOpen(false)} style={styles.closeBtn}><Text style={{ color: '#e74c3c', fontWeight: '700', fontSize: 12 }}>✕ Close Panel</Text></TouchableOpacity>
            </View>
      <View style={{ flexDirection: 'row', gap: 6, marginBottom: 12 }}>
        {subjectOptions.map(sub => (
          <TouchableOpacity key={sub} style={{ backgroundColor: selectedExamSubject === sub ? '#34495e' : '#f4f6f6', padding: 10, borderRadius: 6, flex: 1, alignItems: 'center', borderWidth: 1, borderColor: selectedExamSubject === sub ? '#2c3e50' : '#eaeded' }} onPress={() => { setSelectedExamSubject(sub); setSelectedFeedbackSubject(sub); }}>
            <Text style={{ color: selectedExamSubject === sub ? '#fff' : '#2c3e50', fontWeight: '700', fontSize: 12 }}>{sub}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={{ backgroundColor: '#f8fafc', borderRadius: 10, borderWidth: 1, borderColor: '#dbeafe', padding: 12, marginBottom: 14 }}>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => setIsCustomExamFormOpen(previous => !previous)}
          style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
        >
          <Text style={{ fontSize: 12, fontWeight: '700', color: '#1d4ed8' }}>➕ Add a custom prelim paper</Text>
          <Text style={{ fontSize: 12, fontWeight: '700', color: '#1d4ed8' }}>{isCustomExamFormOpen ? '▲' : '▼'}</Text>
        </TouchableOpacity>
        {isCustomExamFormOpen && (
          <View style={{ marginTop: 8 }}>
            <TextInput
              style={[styles.input, { marginBottom: 8 }]}
              placeholder="e.g. 2026 St Nicholas Prelim Paper 1"
              value={customExamName}
              onChangeText={setCustomExamName}
            />
            <View style={{ flexDirection: 'row', gap: 6, marginBottom: 10 }}>
              {subjectOptions.map(sub => (
                <TouchableOpacity key={`exam-${sub}`} style={{ backgroundColor: customExamSubject === sub ? '#3b82f6' : '#f4f6f6', padding: 8, borderRadius: 6, flex: 1, alignItems: 'center' }} onPress={() => setCustomExamSubject(sub)}>
                  <Text style={{ color: customExamSubject === sub ? '#fff' : '#2c3e50', fontSize: 11, fontWeight: '700' }}>{sub}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={styles.btn} onPress={handleAddCustomExam}>
              <Text style={{ color: '#fff', fontWeight: '700' }}>Add Custom Exam</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
      <View style={{ flex: 1, minHeight: 220, maxHeight: 280, backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: '#eaeded', padding: 8, elevation: 1, marginBottom: 15 }}>
        <FlatList
          data={assignableExamRows.slice().sort((first, second) => {
            if (first.assigned === 0 && second.assigned !== 0) return -1;
            if (first.assigned !== 0 && second.assigned === 0) return 1;
            if (first.status === 'In Progress' && second.status === 'Completed') return -1;
            if (first.status === 'Completed' && second.status !== 'Completed') return 1;
            return 0;
          })}
          key={`prelims-${selectedExamSubject}`}
          extraData={selectedExamSubject}
          keyExtractor={exam => `${selectedExamSubject}-${exam.id}`}
          style={{ flex: 1 }}
          persistentScrollbar
          nestedScrollEnabled
          showsVerticalScrollIndicator
          contentContainerStyle={{ flexGrow: 1, paddingBottom: 15 }}
          renderItem={({ item: exam }) => (
              <View key={exam.id} style={[styles.card, { backgroundColor: exam.assigned === 0 ? '#fff' : '#fdfefe', borderLeftWidth: 4, borderLeftColor: exam.assigned === 0 ? '#3498db' : (exam.status === 'Completed' ? '#2ecc71' : '#e67e22'), marginBottom: 8, marginRight: 6, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 12 }]}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={{ fontWeight: '700', color: '#2c3e50', fontSize: 13 }}>{exam.title || exam.name}</Text>
                  <Text style={{ fontSize: 11, color: '#7f8c8d', marginTop: 2 }}>Status: {exam.assigned === 0 ? '🚫 Pending' : `⚡ ${exam.status}`}</Text>
                  {exam.status === 'Completed' && <Text style={{ fontSize: 11, color: '#2ecc71', fontWeight: '700', marginTop: 2 }}>Marks: {exam.score} / {exam.totalScore}</Text>}
                </View>
                {exam.assigned === 0 ? (
                  <TouchableOpacity style={{ backgroundColor: '#1abc9c', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 5 }} onPress={() => handleAssignExam(exam.id)}>
                    <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>➕ Unlock</Text>
                  </TouchableOpacity>
                ) : (
                  <Text style={{ backgroundColor: exam.status === 'Completed' ? '#2ecc71' : '#e67e22', color: '#fff', fontWeight: '700', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 }}>{exam.status === 'Completed' ? exam.alGrade : 'Active'}</Text>
                )}
              </View>
          )}
          ListEmptyComponent={<Text style={{ color: '#7f8c8d', textAlign: 'center', padding: 12 }}>No prelim papers for this subject.</Text>}
        />
      </View>
          </View>
          </View>
        </Modal>
      )}

      <Text style={styles.heading}>Syllabus Mistakes Error Log</Text>
      <View style={styles.card}>
        {mistakeRows?.length === 0 ? <Text style={{ color: '#9CA3AF' }}>No errors cataloged.</Text> : mistakeRows?.map(m => {
          const isExpanded = expandedMistakeTitle === (m.title || m.name);
          return (
            <View key={m.title || m.name} style={{ marginBottom: 10, borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: '#e5e7eb' }}>
              <TouchableOpacity style={{ padding: 12, backgroundColor: '#f4f6f6', flexDirection: 'row', justifyContent: 'space-between' }} onPress={() => setExpandedMistakeTitle(isExpanded ? null : (m.title || m.name))}>
                <Text style={{ fontWeight: '700', color: '#2c3e50', flex: 1 }}>{m.title || m.name}</Text>
                <Text style={{ color: '#6b7280', fontWeight: '700' }}>Count: {m.occurrence || 1}</Text>
              </TouchableOpacity>
              {isExpanded && (
                <View style={{ padding: 12, backgroundColor: '#fff' }}>
                  {m.descriptions?.length > 0 && m.descriptions.map((description, idx) => (
                    <Text key={`description-${idx}`} style={{ fontSize: 12, color: '#374151', marginBottom: 6 }}>Description {idx + 1}: {description}</Text>
                  ))}
                  {m.photos?.length > 0 && (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }} style={{ marginTop: 10 }}>
                      {m.photos.map((url, idx) => (
                        <View key={url} style={{ width: 220 }}>
                          <Image source={{ uri: url }} style={{ width: 220, height: 160, borderRadius: 6 }} resizeMode="cover" />
                          <Text style={{ fontSize: 10, color: '#374151', marginTop: 4 }}>{m.photoDescriptions?.[idx] || 'No description provided'}</Text>
                        </View>
                      ))}
                    </ScrollView>
                  )}
                  {(!m.descriptions || m.descriptions.length === 0) && (!m.photos || m.photos.length === 0) && <Text style={{ fontSize: 12, color: '#7f8c8d' }}>No description provided</Text>}
                </View>
              )}
            </View>
          );
        })}
      </View>

      {isParentSyllabusDrawerOpen && (
        <View style={styles.overlay}>
          <View style={[styles.drawerLarge, styles.assignmentDrawer]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
              <Text style={{ fontSize: 15, fontWeight: '700', color: '#2c3e50' }}>📐 Syllabus Topics Progress (Read-Only)</Text>
              <TouchableOpacity onPress={() => setIsParentSyllabusDrawerOpen(false)} style={styles.closeBtn}><Text style={{ color: '#e74c3c', fontWeight: '700', fontSize: 12 }}>✕ Close Panel</Text></TouchableOpacity>
            </View>
            <View style={{ flexDirection: 'row', gap: 6, marginBottom: 15 }}>
              {subjectOptions.map(sub => (
                <TouchableOpacity key={sub} style={{ backgroundColor: selectedFeedbackSubject === sub ? '#9b59b6' : '#f4f6f6', padding: 10, borderRadius: 6, flex: 1, alignItems: 'center' }} onPress={() => setSelectedFeedbackSubject(sub)}>
                  <Text style={{ color: selectedFeedbackSubject === sub ? '#fff' : '#2c3e50', fontWeight: '700', fontSize: 12 }}>{sub}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 20 }}>
              {dashboardData?.syllabusProgress?.filter(p => normalizeSubject(p.subject) === normalizeSubject(selectedFeedbackSubject)).map((p) => (
                <View key={p.id} style={{ backgroundColor: p.progress === 100 ? '#d4edda' : '#fcfcfc', padding: 14, borderRadius: 8, marginBottom: 8, borderWidth: 1, borderColor: p.progress === 100 ? '#2ecc71' : '#eaeded', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View style={{ flex: 1, marginRight: 10 }}>
                    <Text style={{ fontWeight: '700', color: p.progress === 100 ? '#155724' : '#2c3e50', fontSize: 13 }}>{p.name} ({p.level})</Text>
                    <Text style={{ fontSize: 11, color: p.progress === 100 ? '#155724' : '#7f8c8d', marginTop: 2 }}>Status: {p.progress}% Complete | Confidence: {p.confidence || 'Low'}</Text>
                  </View>
                  <Text style={{ backgroundColor: p.progress === 100 ? '#2ecc71' : '#34495e', color: '#fff', fontWeight: '700', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, fontSize: 11 }}>{p.progress}% Complete</Text>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      )}

      {isAnalyticsDrawerOpen && (
        <View style={styles.overlay}>
          <View style={styles.drawerLarge}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
              <Text style={{ fontSize: 15, fontWeight: '700', color: '#2c3e50' }}>📈 Subject Topic Coverage</Text>
              <TouchableOpacity onPress={() => setIsAnalyticsDrawerOpen(false)} style={styles.closeBtn}><Text style={{ color: '#e74c3c', fontWeight: '700', fontSize: 12 }}>✕ Close Panel</Text></TouchableOpacity>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 14, marginBottom: 14 }}>
              <Text style={{ fontSize: 10, color: '#1abc9c', fontWeight: '700' }}>■ Syllabus Topics</Text>
              <Text style={{ fontSize: 10, color: '#e67e22', fontWeight: '700' }}>■ Revision Topics</Text>
            </View>
            <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
              {subjectOptions.map(subject => {
                const coverage = topicCoverage[subject];
                const syllabusPercent = coverage.syllabusTotal ? (coverage.syllabusCovered / coverage.syllabusTotal) * 100 : 0;
                const revisionPercent = coverage.revisionTotal ? (coverage.revisionCovered / coverage.revisionTotal) * 100 : 0;
                return (
                  <View key={subject} style={{ backgroundColor: '#fff', padding: 14, borderRadius: 8, marginBottom: 10, borderWidth: 1, borderColor: '#eaeded' }}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#2c3e50', marginBottom: 8 }}>{subject}</Text>
                    <Text style={{ fontSize: 11, color: '#16a085', fontWeight: '700' }}>Syllabus: {coverage.syllabusCovered}/{coverage.syllabusTotal} covered</Text>
                    <View style={{ height: 8, backgroundColor: '#E5E7EB', borderRadius: 4, overflow: 'hidden', marginTop: 3, marginBottom: 7 }}>
                      <View style={{ height: '100%', backgroundColor: '#1abc9c', width: `${syllabusPercent}%` }} />
                    </View>
                    <Text style={{ fontSize: 11, color: '#d35400', fontWeight: '700' }}>Revision: {coverage.revisionCovered}/{coverage.revisionTotal} covered</Text>
                    <View style={{ height: 8, backgroundColor: '#E5E7EB', borderRadius: 4, overflow: 'hidden', marginTop: 3 }}>
                      <View style={{ height: '100%', backgroundColor: '#e67e22', width: `${revisionPercent}%` }} />
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          </View>
        </View>
      )}

      {isRevisionSeason && isRevisionDrawerOpen && (
        <Modal visible transparent animationType="slide" onRequestClose={() => setIsRevisionDrawerOpen(false)}>
          <View style={styles.overlay}>
          <View style={styles.drawerLarge}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 15 }}>
              <Text style={{ flex: 1, marginRight: 10, fontSize: 15, fontWeight: '700', color: '#2c3e50' }}>🔁 Parent Revision Topics</Text>
              <TouchableOpacity onPress={() => setIsRevisionDrawerOpen(false)} style={styles.closeBtn}><Text style={{ color: '#e74c3c', fontWeight: '700', fontSize: 12 }}>✕ Close Panel</Text></TouchableOpacity>
            </View>
            <Text style={{ fontSize: 11, color: '#7f8c8d', marginBottom: 12 }}>Select revision topics from the exam bank to unlock after May.</Text>
            <View style={{ flexDirection: 'row', gap: 6, marginBottom: 12 }}>
              {subjectOptions.map(subject => (
                <TouchableOpacity key={subject} style={{ backgroundColor: selectedRevisionSubject === subject ? '#34495e' : '#f4f6f6', padding: 10, borderRadius: 6, flex: 1, alignItems: 'center', borderWidth: 1, borderColor: selectedRevisionSubject === subject ? '#2c3e50' : '#eaeded' }} onPress={() => setSelectedRevisionSubject(subject)}>
                  <Text style={{ color: selectedRevisionSubject === subject ? '#fff' : '#2c3e50', fontWeight: '700', fontSize: 12 }}>{subject}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={{ backgroundColor: '#f8fafc', borderRadius: 10, borderWidth: 1, borderColor: '#fed7aa', padding: 12, marginBottom: 14 }}>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setIsCustomRevisionFormOpen(previous => !previous)}
                style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#c2410c' }}>➕ Add a custom revision item</Text>
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#c2410c' }}>{isCustomRevisionFormOpen ? '▲' : '▼'}</Text>
              </TouchableOpacity>
              {isCustomRevisionFormOpen && (
                <View style={{ marginTop: 8 }}>
                  <TextInput
                    style={[styles.input, { marginBottom: 8 }]}
                    placeholder="e.g. Add the Topic here"
                    value={customRevisionName}
                    onChangeText={setCustomRevisionName}
                  />
                  <Text style={{ fontSize: 11, color: '#7f8c8d', marginBottom: 6 }}>Level: {customRevisionLevel}</Text>
                  <View style={{ flexDirection: 'row', gap: 6, marginBottom: 10 }}>
                    {revisionLevelOptions.map(level => (
                      <TouchableOpacity
                        key={`revision-level-${level}`}
                        style={{ backgroundColor: customRevisionLevel === level ? '#f59e0b' : '#f4f6f6', padding: 8, borderRadius: 6, flex: 1, alignItems: 'center', borderWidth: 1, borderColor: customRevisionLevel === level ? '#d97706' : '#eaeded' }}
                        onPress={() => setCustomRevisionLevel(level)}
                      >
                        <Text style={{ color: customRevisionLevel === level ? '#fff' : '#2c3e50', fontSize: 11, fontWeight: '700' }}>{level}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <View style={{ flexDirection: 'row', gap: 6, marginBottom: 10 }}>
                    {subjectOptions.map(sub => (
                      <TouchableOpacity key={`revision-${sub}`} style={{ backgroundColor: customRevisionSubject === sub ? '#f59e0b' : '#f4f6f6', padding: 8, borderRadius: 6, flex: 1, alignItems: 'center' }} onPress={() => setCustomRevisionSubject(sub)}>
                        <Text style={{ color: customRevisionSubject === sub ? '#fff' : '#2c3e50', fontSize: 11, fontWeight: '700' }}>{sub}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <TouchableOpacity style={[styles.btn, { backgroundColor: '#f59e0b' }]} onPress={handleAddCustomRevision}>
                    <Text style={{ color: '#fff', fontWeight: '700' }}>Add Custom Revision</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            <View style={{ height: 320, minHeight: 220, backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: '#fed7aa', padding: 8 }}>
              <FlatList
                      data={assignableRevisionTopics}
                key={`revision-${selectedRevisionSubject}`}
                extraData={selectedRevisionSubject}
                keyExtractor={topic => String(topic.id)}
                style={{ flex: 1 }}
                contentContainerStyle={{ flexGrow: 1, paddingBottom: 20 }}
                nestedScrollEnabled
                showsVerticalScrollIndicator
                renderItem={({ item: topic }) => (
                  <View key={topic.id} style={{ backgroundColor: '#fff', padding: 12, borderRadius: 8, marginBottom: 8, borderWidth: 1, borderColor: '#3498db', borderLeftWidth: 4 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <View style={{ flex: 1, marginRight: 8 }}>
                        <Text style={{ fontWeight: '700', color: '#2c3e50', fontSize: 13 }}>{topic.name} ({topic.subject}{topic.level ? `, ${topic.level}` : ''})</Text>
                        <Text style={{ fontSize: 11, color: '#7f8c8d', marginTop: 3 }}>Status: {topic.status || 'Pending'} | {topic.progress || 0}% Complete</Text>
                      </View>
                      <TouchableOpacity
                        disabled={Number(topic.assigned) === 1}
                        style={{ backgroundColor: topic.status === 'Completed' ? '#2ecc71' : (Number(topic.assigned) === 1 ? '#e67e22' : '#1abc9c'), paddingHorizontal: 10, paddingVertical: 6, borderRadius: 5 }}
                        onPress={() => handleAssignRevision(topic.id)}
                      >
                        <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>{topic.status === 'Completed' ? '✓ Completed' : (Number(topic.assigned) === 1 ? '⚡ Active' : '➕ Select')}</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
                ListEmptyComponent={<Text style={{ color: '#7f8c8d', textAlign: 'center', padding: 12 }}>No unassigned revision topics for this subject.</Text>}
              />
            </View>
          </View>
          </View>
        </Modal>
      )}

      {isParentDrawerOpen && (
        <View style={styles.overlay}>
          <ScrollView
            style={{ flex: 1, backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 }}
            contentContainerStyle={{ flexGrow: 1, paddingBottom: 40 }}
            showsVerticalScrollIndicator
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
              <Text style={{ fontSize: 15, fontWeight: '700', color: '#2c3e50' }}>📊 Teacher Feedback & Progress Hub</Text>
              <TouchableOpacity onPress={() => setIsParentDrawerOpen(false)} style={styles.closeBtn}><Text style={{ color: '#e74c3c', fontWeight: '700', fontSize: 12 }}>✕ Close</Text></TouchableOpacity>
            </View>
            <View style={{ flexDirection: 'row', backgroundColor: '#eaeded', borderRadius: 8, padding: 4, marginBottom: 15 }}>
              <TouchableOpacity style={{ flex: 1, paddingVertical: 8, alignItems: 'center', backgroundColor: activeFeedbackTab === 'Log' ? '#fff' : 'transparent', borderRadius: 6 }} onPress={() => setActiveFeedbackTab('Log')}>
                <Text style={{ fontWeight: '700', color: '#2c3e50', fontSize: 11 }}>✍️ Log Evaluation</Text>
              </TouchableOpacity>
              <TouchableOpacity style={{ flex: 1, paddingVertical: 8, alignItems: 'center', backgroundColor: activeFeedbackTab === 'Trends' ? '#fff' : 'transparent', borderRadius: 6 }} onPress={() => setActiveFeedbackTab('Trends')}>
                <Text style={{ fontWeight: '700', color: '#2c3e50', fontSize: 11 }}>📊 Metrics & Charts</Text>
              </TouchableOpacity>
              <TouchableOpacity style={{ flex: 1, paddingVertical: 8, alignItems: 'center', backgroundColor: activeFeedbackTab === 'Prelims' ? '#fff' : 'transparent', borderRadius: 6 }} onPress={() => setActiveFeedbackTab('Prelims')}>
                <Text style={{ fontWeight: '700', color: '#2c3e50', fontSize: 11 }}>🏆 Prelims</Text>
              </TouchableOpacity>
            </View>

            {activeFeedbackTab === 'Log' && (
              <View style={{ backgroundColor: '#fcfcfc', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#eaeded' }}>
                <View style={{ flexDirection: 'row', gap: 6, marginBottom: 12 }}>
                  {['School', 'Tuition'].map(src => (
                    <TouchableOpacity key={src} style={{ backgroundColor: feedbackSource === src ? '#34495e' : '#f4f6f6', padding: 8, borderRadius: 5, flex: 1, alignItems: 'center' }} onPress={() => setFeedbackSource(src)}>
                      <Text style={{ color: feedbackSource === src ? '#fff' : '#2c3e50', fontSize: 12, fontWeight: '700' }}>{src}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <View style={{ flexDirection: 'row', gap: 4, marginBottom: 12 }}>
                  {subjectOptions.map(sub => (
                    <TouchableOpacity key={sub} style={{ backgroundColor: selectedFeedbackSubject === sub ? '#1abc9c' : '#f4f6f6', padding: 6, borderRadius: 4, flex: 1, alignItems: 'center' }} onPress={() => setSelectedFeedbackSubject(sub)}>
                      <Text style={{ color: selectedFeedbackSubject === sub ? '#fff' : '#2c3e50', fontSize: 11 }}>{sub}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <View style={{ height: 40, marginBottom: 12 }}>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 4, alignItems: 'center' }}>
                    {monthOptions.map(mth => (
                      <TouchableOpacity key={mth} style={{ backgroundColor: selectedFeedbackMonth === mth ? '#2c3e50' : '#f4f6f6', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 4 }} onPress={() => setSelectedFeedbackMonth(mth)}>
                        <Text style={{ color: selectedFeedbackMonth === mth ? '#fff' : '#2c3e50', fontSize: 11 }}>{mth}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
                <TextInput style={styles.input} placeholder="Performance Rating (0-100)" value={feedbackRating} onChangeText={setFeedbackRating} keyboardType="number-pad" />
                <TextInput style={[styles.input, { height: 60, textAlign: 'left', paddingHorizontal: 10 }]} placeholder="Type teacher's descriptive remarks..." value={feedbackNotes} onChangeText={setFeedbackNotes} multiline />
                <TouchableOpacity style={styles.btn} onPress={handleSaveMonthlyFeedback}>
                  <Text style={{ color: '#FFF', fontWeight: '700' }}>💾 Commit Teacher Evaluation</Text>
                </TouchableOpacity>
              </View>
            )}

            {activeFeedbackTab === 'Trends' && (
              <MetricsChartsTab
                chartType={chartType}
                setChartType={setChartType}
                feedbackRows={feedbackRows}
                cardStyle={styles.card}
              />
            )}

            {activeFeedbackTab === 'Prelims' && (
              <PrelimsExamTab subjectExamStats={subjectExamStats} cardStyle={styles.card} />
            )}
          </ScrollView>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  avatarBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 10, padding: 10, marginBottom: 12, elevation: 1 },
  avatarBarImage: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#f3f4f6' },
  avatarBarText: { fontSize: 11, fontWeight: '600', color: '#1abc9c', marginTop: 2 },
  profileRow: { flexDirection: 'row', alignItems: 'center' },
  profileTextCol: { flex: 1, marginLeft: 10 },
  heading: { fontSize: 15, fontWeight: '800', color: '#2c3e50', marginTop: 16, marginBottom: 8 },
  card: { backgroundColor: '#FFF', padding: 12, borderRadius: 8, elevation: 1, shadowOpacity: 0.05, shadowRadius: 2 },
  alert: { backgroundColor: '#FEF2F2', padding: 10, borderRadius: 6, flexDirection: 'row', marginBottom: 8 },
  smallBtn: { backgroundColor: '#1abc9c', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 4, justifyContent: 'center' },
  assignmentButton: { backgroundColor: '#f4f6f6', padding: 12, borderRadius: 8, flex: 1, alignItems: 'center', borderWidth: 1, borderColor: '#e67e22' },
  assignmentButtonText: { color: '#2c3e50', fontWeight: '700', fontSize: 11 },
  btn: { backgroundColor: '#1abc9c', padding: 12, borderRadius: 6, alignItems: 'center' },
  input: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 6, padding: 8, marginBottom: 8, fontSize: 13, color: '#2c3e50' },
  overlay: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end', zIndex: 20, flex: 1, display: 'flex' },
  drawerLarge: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 22, height: '85%', maxHeight: '85%', minHeight: 0, width: '100%', overflow: 'hidden' },
  assignmentDrawer: { display: 'flex' },
  closeBtn: { flexShrink: 0, backgroundColor: '#f4f6f6', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 15 }
});
