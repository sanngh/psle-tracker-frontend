import React, { useState, useContext, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput, Alert, Modal, Button, Image, ActivityIndicator } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { AppContext } from '../context/AppContext';
import { REQUIRE_EVIDENCE_LINKING } from '../appConfig';
import { CONFIDENCE_LEVELS, KEYWORD_TAG_LIMIT } from '../appConfig';
import { saveImageToAppStorage, addPendingMistake, getPendingMistakes, syncPendingMistakes } from '../utils/localEvidenceStore';
import { getAvatarSource } from '../utils/avatarConfig';
import AvatarPicker from '../components/AvatarPicker';

const monthOptions = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October'];
const subjectOptions = ['Science', 'Mathematics', 'English'];
const confidenceOptions = CONFIDENCE_LEVELS.length > 0 ? CONFIDENCE_LEVELS : ['Low', 'Medium', 'Good', 'Very Good', 'High'];


export default function StudentDeck() {
  const { API_URL, userKey, avatar, setAvatar, dashboardData, refreshData } = useContext(AppContext);
  const [isAvatarPickerOpen, setIsAvatarPickerOpen] = useState(false);
  const [isAvatarLabelVisible, setIsAvatarLabelVisible] = useState(false);
  const [activeTest, setActiveTest] = useState(null);
  const [activeRevision, setActiveRevision] = useState(null);
  const [scoreInput, setScoreInput] = useState('');
  const [timerInterval, setTimerInterval] = useState(null);
  const [revisionTimerInterval, setRevisionTimerInterval] = useState(null);
  const [secondsElapsed, setSecondsElapsed] = useState(0);
  const [revisionSecondsElapsed, setRevisionSecondsElapsed] = useState(0);
  const examSecondsRef = useRef(0);
  const revisionSecondsRef = useRef(0);
  const revisionProgressRef = useRef(0);
  const [errorDescription, setErrorDescription] = useState('');
  const [selectedTopicId, setSelectedTopicId] = useState(null);
  const [selectedFeedbackSubject, setSelectedFeedbackSubject] = useState('Science');
  const [selectedFeedbackMonth, setSelectedFeedbackMonth] = useState('January');
  const [feedbackRating, setFeedbackRating] = useState('');
  const [feedbackNotes, setFeedbackNotes] = useState('');
  const [feedbackSource, setFeedbackSource] = useState('Self');
  const [isStudentDrawerOpen, setIsStudentDrawerOpen] = useState(false);
  const [isSyllabusDrawerOpen, setIsSyllabusDrawerOpen] = useState(false);
  const [errorTitle, setErrorTitle] = useState('');
  const [selectedPhotoUri, setSelectedPhotoUri] = useState(null);
  const [evidenceTarget, setEvidenceTarget] = useState(null);
  const [isEvidencePickerOpen, setIsEvidencePickerOpen] = useState(false);
  const [pendingPhotoCount, setPendingPhotoCount] = useState(0);
  const [pendingEvidence, setPendingEvidence] = useState([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [linkedParents, setLinkedParents] = useState([]);
  const [showLinkedParentPhone, setShowLinkedParentPhone] = useState(false);
  const [isKeywordDropdownOpen, setIsKeywordDropdownOpen] = useState(false);
  const [pendingConfidenceTopicId, setPendingConfidenceTopicId] = useState(null);

  useEffect(() => {
    const loadParentLink = async () => {
      if (!userKey) {
        setLinkedParents([]);
        return;
      }
      try {
        const response = await fetch(`${API_URL}/links/parent`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userKey: userKey.trim() })
        });
        if (!response.ok) return;
        const parentRows = await response.json();
        setLinkedParents(parentRows || []);
      } catch (error) {
        console.error('Failed to load linked parent', error);
      }
    };

    loadParentLink();
    const intervalId = setInterval(loadParentLink, 10000);
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
    } catch (error) {
      Alert.alert('Connection Error', 'Unable to reach backend gateway pipeline.');
    }
  };
  const refreshPendingCount = async () => {
    if (!userKey) return;
    const pending = await getPendingMistakes(userKey);
    setPendingPhotoCount(pending.length);
    setPendingEvidence(pending);
  };  useEffect(() => {
    refreshPendingCount();
  }, [userKey]);

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

  useEffect(() => {
    return () => {
      if (timerInterval) clearInterval(timerInterval);
      if (revisionTimerInterval) clearInterval(revisionTimerInterval);
    };
  }, [timerInterval, revisionTimerInterval]);

  revisionSecondsRef.current = revisionSecondsElapsed;
  examSecondsRef.current = secondsElapsed;

  useEffect(() => {
    if (!activeRevision || !revisionTimerInterval) return undefined;
    const autosaveTimer = setInterval(() => {
      fetch(`${API_URL}/revisions/update-timer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: activeRevision.id, elapsedSeconds: revisionSecondsRef.current, userKey })
      }).catch(error => console.error(error));
    }, 10000);
    return () => clearInterval(autosaveTimer);
  }, [activeRevision, revisionTimerInterval, API_URL, userKey]);

  useEffect(() => {
    if (!activeTest || !timerInterval) return undefined;
    const autosaveTimer = setInterval(() => {
      fetch(`${API_URL}/exams/update-timer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: activeTest.id, elapsedSeconds: examSecondsRef.current, userKey })
      }).catch(error => console.error(error));
    }, 10000);
    return () => clearInterval(autosaveTimer);
  }, [activeTest, timerInterval, API_URL, userKey]);

  if (!dashboardData) return <ActivityIndicator style={{ marginTop: 40 }} size="large" color="#1abc9c" />;

  const { syllabusProgress = [], exams = [], pastDescriptions = [], revisionTopics = [], alerts = [] } = dashboardData;
  const studentRevisionTopics = revisionTopics.filter(topic => Number(topic.assigned) === 1 && String(topic.status || '').trim() !== 'Completed');
  const activeExams = exams.filter(e => e.assigned === 1 && e.status !== 'Completed');
  const isRevisionSeason = new Date().getMonth() >= 5;
  const evidenceOptions = [
    ...activeExams.map(exam => ({ type: 'exam', id: exam.id, label: `Exam: ${exam.title || exam.name}` })),
    ...studentRevisionTopics.map(topic => ({ type: 'revision', id: topic.id, label: `Revision: ${topic.name}` }))
  ];
  const selectedEvidenceLabel = evidenceOptions.find(option => option.type === evidenceTarget?.type && option.id === evidenceTarget?.id)?.label;

  const startTestClock = (exam) => {
    setActiveTest(exam);
    const savedSeconds = Number(exam.timer_seconds) || 0;
    examSecondsRef.current = savedSeconds;
    setSecondsElapsed(savedSeconds);
    setScoreInput('');
    if (timerInterval) {
      clearInterval(timerInterval);
      setTimerInterval(null);
    }
  };

  const persistExamTimer = () => {
    if (!activeTest) return;
    return fetch(`${API_URL}/exams/update-timer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: activeTest.id, elapsedSeconds: examSecondsRef.current, userKey })
    }).catch(error => console.error(error));
  };

  const toggleTestTimer = () => {
    if (timerInterval) {
      clearInterval(timerInterval);
      setTimerInterval(null);
      persistExamTimer();
      return;
    }

    const interval = setInterval(() => setSecondsElapsed(prev => {
      const nextSeconds = prev + 1;
      examSecondsRef.current = nextSeconds;
      return nextSeconds;
    }), 1000);
    setTimerInterval(interval);
  };

  const resetTestTimer = () => {
    if (timerInterval) clearInterval(timerInterval);
    setTimerInterval(null);
    setSecondsElapsed(0);
    examSecondsRef.current = 0;
  };

  const persistRevisionTimer = () => {
    if (!activeRevision) return;
    return fetch(`${API_URL}/revisions/update-timer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: activeRevision.id, elapsedSeconds: revisionSecondsRef.current, userKey })
    }).catch(error => console.error(error));
  };

  const persistRevisionState = () => {
    if (!activeRevision) return;
    return fetch(`${API_URL}/revisions/update-progress`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: activeRevision.id, progress: revisionProgressRef.current, elapsedSeconds: revisionSecondsRef.current, userKey })
    }).catch(error => console.error(error));
  };

  const closeRevisionPanel = async () => {
    const revision = activeRevision;
    const progress = revisionProgressRef.current;
    const elapsedSeconds = revisionSecondsRef.current;
    if (!revision) return;
    if (revisionTimerInterval) {
      clearInterval(revisionTimerInterval);
      setRevisionTimerInterval(null);
    }
    try {
      const response = await fetch(`${API_URL}/revisions/update-progress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: revision.id, progress, elapsedSeconds, userKey })
      });
      if (!response.ok) throw new Error('Revision state save failed.');
      const result = await response.json();
      if (result.updated !== 1) throw new Error('Revision topic was not found or assigned.');
      resetRevisionTimer();
      setActiveRevision(null);
      refreshData();
    } catch (error) {
      Alert.alert('Save Failed', 'Revision time and completion could not be saved. Please try again.');
    }
  };

  const closeExamPanel = async () => {
    const exam = activeTest;
    const elapsedSeconds = examSecondsRef.current;
    if (!exam) return;
    if (timerInterval) {
      clearInterval(timerInterval);
      setTimerInterval(null);
    }
    try {
      const response = await fetch(`${API_URL}/exams/update-timer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: exam.id, elapsedSeconds, userKey })
      });
      if (!response.ok) throw new Error('Exam timer save failed.');
      const result = await response.json();
      if (result.updated !== 1) throw new Error('Exam paper was not found or assigned.');
      resetTestTimer();
      setActiveTest(null);
      refreshData();
    } catch (error) {
      Alert.alert('Save Failed', 'Exam timer could not be saved. Please try again.');
    }
  };

  const openRevision = (topic) => {
    setActiveRevision(topic);
    const savedSeconds = Number(topic.timer_seconds) || 0;
    revisionSecondsRef.current = savedSeconds;
    revisionProgressRef.current = Number(topic.progress) || 0;
    setRevisionSecondsElapsed(savedSeconds);
    if (revisionTimerInterval) {
      clearInterval(revisionTimerInterval);
      setRevisionTimerInterval(null);
    }
  };

  const toggleRevisionTimer = () => {
    if (revisionTimerInterval) {
      clearInterval(revisionTimerInterval);
      setRevisionTimerInterval(null);
      persistRevisionTimer();
      return;
    }
    const interval = setInterval(() => setRevisionSecondsElapsed(prev => {
      const nextSeconds = prev + 1;
      revisionSecondsRef.current = nextSeconds;
      return nextSeconds;
    }), 1000);
    setRevisionTimerInterval(interval);
  };

  const resetRevisionTimer = () => {
    if (revisionTimerInterval) clearInterval(revisionTimerInterval);
    setRevisionTimerInterval(null);
    setRevisionSecondsElapsed(0);
    revisionSecondsRef.current = 0;
  };

  const updateRevisionProgress = async (progress) => {
    revisionProgressRef.current = progress;
    try {
      const response = await fetch(`${API_URL}/revisions/update-progress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: activeRevision.id, progress, elapsedSeconds: revisionSecondsRef.current, userKey })
      });
      if (response.ok) {
        if (progress === 100) {
          resetRevisionTimer();
          setActiveRevision(null);
        } else {
          setActiveRevision({ ...activeRevision, progress, status: 'In Progress' });
        }
        refreshData();
      } else {
        const data = await response.json().catch(() => ({}));
        Alert.alert('Verification Required', data.error || 'Add a linked Mistakes Log entry before marking 100%.');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const submitExamScore = async () => {
    const raw = parseFloat(scoreInput);
    if (isNaN(raw) || raw < 0 || raw > 100) {
      Alert.alert('Validation Check Failure', 'Key score matrix context between 0 and 100.');
      return;
    }

    if (timerInterval) {
      clearInterval(timerInterval);
      setTimerInterval(null);
    }

    try {
      const res = await fetch(`${API_URL}/exams/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ examId: activeTest.id, score: raw, totalScore: 100, status: 'Completed', elapsedSeconds: examSecondsRef.current, userKey })
      });

      if (res.ok) {
        Alert.alert('Exam Logged', 'Thank you for recording your results.');
        setActiveTest(null);
        setScoreInput('');
        refreshData();
      } else {
        const data = await res.json().catch(() => ({}));
        Alert.alert('Verification Required', data.error || 'Add a linked Mistakes Log entry before completing this paper.');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateMastery = async (hubId, nextLvl, confidence) => {
    if (nextLvl === 100 && !confidence) {
      setPendingConfidenceTopicId(hubId);
      return;
    }
    try {
      const response = await fetch(`${API_URL}/syllabus/update-progress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: hubId, progress: nextLvl, confidence, userKey })
      });
      if (response.ok) {
        setPendingConfidenceTopicId(null);
        refreshData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleLogMistake = async () => {
    if ((REQUIRE_EVIDENCE_LINKING && !selectedTopicId) || !errorDescription.trim()) {
      Alert.alert('Missing Data', 'Select a syllabus node and explain the error context.');
      return;
    }

    try {
      const res = await fetch(`${API_URL}/errors/log-text`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userKey, title: 'Student error log', category: 'General', description: errorDescription, hubId: selectedTopicId, revisionId: evidenceTarget?.type === 'revision' ? evidenceTarget.id : null, examId: evidenceTarget?.type === 'exam' ? evidenceTarget.id : null })
      });
      if (res.ok) {
        Alert.alert('Saved', 'Error cataloged in Mistake Log book.');
        setErrorDescription('');
        setSelectedTopicId(null);
        setEvidenceTarget(null);
        refreshData();
      }
    } catch (e) {
      console.error(e);
    }
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
          source: feedbackSource,
          month: selectedFeedbackMonth,
          subject: selectedFeedbackSubject,
          remarks: feedbackNotes.trim(),
          score: parseInt(feedbackRating, 10),
          userKey
        })
      });

      if (response.ok) {
        Alert.alert('Feedback Recorded', 'Evaluation logged.');
        setFeedbackRating('');
        setFeedbackNotes('');
        setIsStudentDrawerOpen(false);
        refreshData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeviceCameraCapture = async () => {
    const rights = await ImagePicker.requestCameraPermissionsAsync();
    if (!rights.granted) {
      Alert.alert('Permission Denied', 'Camera tracking channel access is required.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({ allowsEditing: true, quality: 0.6 });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      try {
        const capturedImage = result.assets[0];
        const persistedUri = await saveImageToAppStorage(capturedImage.uri, capturedImage.width, capturedImage.height);
        setSelectedPhotoUri(persistedUri);
        Alert.alert('Success', 'Image snapshot saved to your phone successfully!');
      } catch (e) {
        Alert.alert('Storage Error', 'Could not save the photo on this device.');
      }
    }
  };

  const submitMistakePhotoLogToPC = async () => {
    if (!errorTitle.trim() || !errorDescription.trim() || !selectedPhotoUri || (REQUIRE_EVIDENCE_LINKING && !evidenceTarget)) {
      Alert.alert('Validation Error', 'Select the exam or revision topic this evidence belongs to, then enter a keyword, description, and photo.');
      return;
    }

    try {
      await addPendingMistake({
        userKey,
        title: errorTitle.trim(),
        description: errorDescription.trim(),
        category: 'Missing Keywords (OEQ)',
        revisionId: evidenceTarget?.type === 'revision' ? evidenceTarget.id : null,
        examId: evidenceTarget?.type === 'exam' ? evidenceTarget.id : null,
        localUri: selectedPhotoUri
      });
      Alert.alert('Saved On Device', 'Photo evidence is stored on your phone. Tap "Sync Now" to send it to your parent.');
      setErrorTitle('');
      setErrorDescription('');
      setSelectedPhotoUri(null);
      setEvidenceTarget(null);
      refreshPendingCount();
    } catch (e) {
      Alert.alert('Storage Error', 'Could not save this evidence on your device.');
    }
  };

  const handleSyncNow = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      const result = await syncPendingMistakes(API_URL, userKey);
      if (result.total === 0) {
        Alert.alert('Nothing to Sync', 'No photo evidence is waiting on this device.');
      } else if (result.limited) {
        Alert.alert('Upload Limit Reached', `${result.succeeded} of ${result.total} photo(s) uploaded. The rest are still saved on your phone \u2014 try syncing again later today.`);
      } else {
        Alert.alert('Sync Complete', `${result.succeeded} of ${result.total} photo(s) uploaded.${result.failed ? ` ${result.failed} failed, will retry next time.` : ''}`);
      }
      await refreshPendingCount();
      refreshData();
    } catch (e) {
      Alert.alert('Sync Error', 'Could not reach the server. Your photos remain safely stored on this device.');
    } finally {
      setIsSyncing(false);
    }
  };

  const dismissAlert = async (id, type) => {
    if (type !== 'revision') return;
    try {
      const response = await fetch(`${API_URL}/revisions/dismiss-alert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, userKey })
      });
      if (response.ok) refreshData();
    } catch (error) {
      console.error('Failed to dismiss alert', error);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ padding: 16 }}
      nestedScrollEnabled
      keyboardShouldPersistTaps="handled"
    >
      <AvatarPicker
        visible={isAvatarPickerOpen}
        role="student"
        currentAvatarId={avatar}
        onSelect={handleChangeAvatar}
        onClose={() => setIsAvatarPickerOpen(false)}
      />
      {alerts.map(alert => (
        <View key={`${alert.type}-${alert.id}`} style={{ backgroundColor: '#e8f8f5', borderWidth: 1, borderColor: '#2ecc71', borderRadius: 6, padding: 10, flexDirection: 'row', marginBottom: 8 }}>
          <Text style={{ color: '#155724', flex: 1, fontWeight: '600', fontSize: 11 }}>{alert.message}</Text>
          <TouchableOpacity onPress={() => dismissAlert(alert.id, alert.type)}>
            <Text style={{ fontWeight: '700', color: '#155724' }}>✕</Text>
          </TouchableOpacity>
        </View>
      ))}
      {linkedParents.length > 0 ? (
        <View style={{ backgroundColor: '#eef7ff', borderWidth: 1, borderColor: '#bfdbfe', borderRadius: 10, padding: 12, marginBottom: 12 }}>
          <View style={styles.profileRow}>
            <TouchableOpacity
              onPress={() => setIsAvatarPickerOpen(true)}
              onPressIn={() => setIsAvatarLabelVisible(true)}
              onPressOut={() => setIsAvatarLabelVisible(false)}
              activeOpacity={0.8}
            >
              <Image source={getAvatarSource('student', avatar)} style={styles.avatarBarImage} />
            </TouchableOpacity>
            <TouchableOpacity activeOpacity={0.8} onPress={() => setShowLinkedParentPhone(prev => !prev)} style={styles.profileTextCol}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#1d4ed8', marginBottom: 4 }}>👨‍👩‍👧 Linked Parents</Text>
              <Text style={{ color: '#374151', fontSize: 12 }}>
                {showLinkedParentPhone ? linkedParents.map(p => p.parent_phone).join(', ') : 'Tap to reveal parent contact'}
              </Text>
              {isAvatarLabelVisible && <Text style={styles.avatarBarText}>Tap your avatar to change it</Text>}
            </TouchableOpacity>
          </View>
          {showLinkedParentPhone && linkedParents.map(parent => parent.locked && (
            <View key={parent.parent_phone} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
              <Text style={{ color: '#374151', fontSize: 12 }}>{parent.parent_phone} — 🔒 Locked</Text>
              <TouchableOpacity style={{ backgroundColor: '#1abc9c', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 6 }} onPress={() => handleUnlockAccount(parent.parent_phone)}>
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 11 }}>Unlock</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      ) : (
        <View style={{ backgroundColor: '#eef7ff', borderWidth: 1, borderColor: '#bfdbfe', borderRadius: 10, padding: 12, marginBottom: 12 }}>
          <View style={styles.profileRow}>
            <TouchableOpacity
              onPress={() => setIsAvatarPickerOpen(true)}
              onPressIn={() => setIsAvatarLabelVisible(true)}
              onPressOut={() => setIsAvatarLabelVisible(false)}
              activeOpacity={0.8}
            >
              <Image source={getAvatarSource('student', avatar)} style={styles.avatarBarImage} />
            </TouchableOpacity>
            <View style={styles.profileTextCol}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#1d4ed8', marginBottom: 4 }}>👨‍👩‍👧 Linked Parents</Text>
              <Text style={{ color: '#374151', fontSize: 12 }}>No parent linked yet. Add the parent phone during registration or ask your parent to link you.</Text>
              {isAvatarLabelVisible && <Text style={styles.avatarBarText}>Tap your avatar to change it</Text>}
            </View>
          </View>
        </View>
      )}
      <Text style={styles.sectionTitle}>🚀 Targets Owed (Outstanding Milestones)</Text>
      {activeExams.length === 0 ? <Text style={styles.emptyText}>Zero outstanding tasks remaining for today.</Text> : activeExams.map(exam => (
        <View key={exam.id} style={styles.card}>
          <Text style={styles.cardHeader}>{exam.title || exam.name} ({exam.subject})</Text>
          <TouchableOpacity style={styles.actionBtn} onPress={() => startTestClock(exam)}>
            <Text style={styles.actionBtnText}>⚡ Start ➔</Text>
          </TouchableOpacity>
        </View>
      ))}

      {isRevisionSeason && studentRevisionTopics.length > 0 && (
        <View style={{ marginTop: 18 }}>
          <Text style={styles.sectionTitle}>🔁 Parent-Driven Revision</Text>
          {studentRevisionTopics.map(topic => (
            <TouchableOpacity key={topic.id} style={[styles.card, { borderLeftWidth: 4, borderLeftColor: '#e67e22' }]} onPress={() => openRevision(topic)}>
              <Text style={styles.cardHeader}>{topic.name} ({topic.subject})</Text>
              <Text style={{ color: '#e67e22', fontSize: 12, fontWeight: '700' }}>Revision progress: {topic.progress}% | Tap to revise ➔</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <View style={{ flexDirection: 'row', gap: 8, marginTop: 18 }}>
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: '#2c3e50', padding: 12, borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: '#1abc9c' }}
          onPress={() => { setFeedbackSource('Self'); setIsStudentDrawerOpen(true); }}
        >
          <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 11 }}>📝 Your feedback Drawer</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: '#34495e', padding: 12, borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: '#9b59b6' }}
          onPress={() => { setSelectedFeedbackSubject('Science'); setIsSyllabusDrawerOpen(true); }}
        >
          <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 11 }}>📐 Open Syllabus Panel</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.syncBar, { marginTop: 18 }]}>
        <Text style={{ color: '#fff', fontSize: 12, flex: 1 }}>
          {pendingPhotoCount > 0 ? `📦 ${pendingPhotoCount} photo(s) stored on this phone, waiting to sync` : '✅ All evidence photos synced'}
        </Text>
        <TouchableOpacity style={styles.syncBtn} onPress={handleSyncNow} disabled={isSyncing}>
          {isSyncing ? <ActivityIndicator size="small" color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '700', fontSize: 11 }}>🔄 Sync Now</Text>}
        </TouchableOpacity>
      </View>

      {pendingEvidence.length > 0 && (
        <View style={[styles.card, { marginTop: 10, borderLeftWidth: 4, borderLeftColor: '#f39c12', backgroundColor: '#fff8e7' }]}>
          <Text style={{ color: '#b9770e', fontWeight: '700', fontSize: 12, marginBottom: 6 }}>📌 Pending Evidence Keywords</Text>
          {pendingEvidence.map(item => (
            <View key={item.localId} style={{ marginBottom: 6 }}>
              <Text style={{ color: '#2c3e50', fontWeight: '700', fontSize: 12 }}>{item.title}</Text>
              <Text style={{ color: '#7f8c8d', fontSize: 11 }}>{item.description}</Text>
            </View>
          ))}
        </View>
      )}

      <View style={[styles.cameraCard, { marginTop: 18 }]}> 
        <Text style={styles.cameraTitle}>📸 Time to Log</Text>
        <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700', marginTop: 10 }}>Link Evidence To</Text>
        <TouchableOpacity style={styles.evidenceSelect} onPress={() => setIsEvidencePickerOpen(prev => !prev)}>
          <Text style={{ color: selectedEvidenceLabel ? '#fff' : '#bdc3c7', fontSize: 11, flex: 1 }}>{selectedEvidenceLabel || 'Select an exam or revision topic'}</Text>
          <Text style={{ color: '#fff', fontSize: 12 }}>{isEvidencePickerOpen ? '▲' : '▼'}</Text>
        </TouchableOpacity>
        {isEvidencePickerOpen && (
          <View style={styles.evidenceDropdown}>
            {evidenceOptions.map(option => (
              <TouchableOpacity key={`${option.type}-${option.id}`} style={styles.evidenceOption} onPress={() => { setEvidenceTarget({ type: option.type, id: option.id }); setIsEvidencePickerOpen(false); }}>
                <Text style={{ color: '#2c3e50', fontSize: 11 }}>{option.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
        {evidenceOptions.length === 0 && <Text style={{ color: '#d5dbdb', fontSize: 10, marginBottom: 6 }}>No assigned exam or revision topics available.</Text>}
        {pastDescriptions.length > 0 && (
          <View style={{ marginVertical: 6 }}>
            {pastDescriptions.length <= KEYWORD_TAG_LIMIT ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {pastDescriptions.map((desc, i) => (
                  <TouchableOpacity key={i} style={styles.pastTag} onPress={() => setErrorTitle(desc)}>
                    <Text style={{ color: '#fff', fontSize: 10 }}>📝 {desc}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            ) : (
              <>
                <TouchableOpacity style={styles.evidenceSelect} onPress={() => setIsKeywordDropdownOpen(prev => !prev)}>
                  <Text style={{ color: '#fff', fontSize: 11, flex: 1 }}>Select a recent keyword</Text>
                  <Text style={{ color: '#fff', fontSize: 12 }}>{isKeywordDropdownOpen ? '▲' : '▼'}</Text>
                </TouchableOpacity>
                {isKeywordDropdownOpen && (
                  <View style={styles.evidenceDropdown}>
                    {pastDescriptions.map((desc, i) => (
                      <TouchableOpacity key={i} style={styles.evidenceOption} onPress={() => { setErrorTitle(desc); setIsKeywordDropdownOpen(false); }}>
                        <Text style={{ color: '#2c3e50', fontSize: 11 }}>{desc}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </>
            )}
          </View>
        )}
        <TextInput
          style={styles.cameraInput}
          placeholder="Describe keywords..."
          placeholderTextColor="#7f8c8d"
          value={errorTitle}
          onChangeText={setErrorTitle}
        />
        <TextInput
          style={styles.cameraInput}
          placeholder="Describe what went wrong..."
          placeholderTextColor="#bdc3c7"
          value={errorDescription}
          onChangeText={setErrorDescription}
          multiline
        />
        <TouchableOpacity style={styles.cameraBtn} onPress={handleDeviceCameraCapture}>
          <Text style={styles.actionBtnText}>{selectedPhotoUri ? '✅ Buffered' : '📷 Click to Capture'}</Text>
        </TouchableOpacity>
        {selectedPhotoUri && <View style={{ marginTop: 12 }}><Button title="Click to Save image" color="#2ecc71" onPress={submitMistakePhotoLogToPC} /></View>}
      </View>

      {isStudentDrawerOpen && (
        <View style={styles.overlay}>
          <View style={[styles.drawer, { flex: 1 }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
              <Text style={{ fontSize: 15, fontWeight: '700', color: '#2c3e50' }}>📝 Monthly Self-Reflection Log</Text>
              <TouchableOpacity onPress={() => setIsStudentDrawerOpen(false)} style={styles.closeBtn}>
                <Text style={{ color: '#e74c3c', fontWeight: '700', fontSize: 12 }}>✕ Close Panel</Text>
              </TouchableOpacity>
            </View>
            <View style={{ flexDirection: 'row', gap: 6, marginBottom: 12 }}>
              {subjectOptions.map(sub => (
                <TouchableOpacity
                  key={sub}
                  style={{ backgroundColor: selectedFeedbackSubject === sub ? '#1abc9c' : '#f4f6f6', padding: 8, borderRadius: 5, flex: 1, alignItems: 'center' }}
                  onPress={() => setSelectedFeedbackSubject(sub)}
                >
                  <Text style={{ color: selectedFeedbackSubject === sub ? '#fff' : '#2c3e50', fontSize: 12 }}>{sub}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={{ height: 40, marginBottom: 15 }}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, alignItems: 'center' }}>
                {monthOptions.map(mth => (
                  <TouchableOpacity key={mth} style={{ backgroundColor: selectedFeedbackMonth === mth ? '#2c3e50' : '#f4f6f6', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 4 }} onPress={() => setSelectedFeedbackMonth(mth)}>
                    <Text style={{ color: selectedFeedbackMonth === mth ? '#fff' : '#2c3e50', fontSize: 11 }}>{mth}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
            <TextInput style={styles.input} placeholder="Marks Target Goal (0-100)..." value={feedbackRating} onChangeText={setFeedbackRating} keyboardType="number-pad" />
            <TextInput style={[styles.input, { height: 70, textAlign: 'left', paddingHorizontal: 10 }]} placeholder="Type your goals..." value={feedbackNotes} onChangeText={setFeedbackNotes} multiline />
            <TouchableOpacity style={styles.actionBtn} onPress={handleSaveMonthlyFeedback}>
              <Text style={styles.actionBtnText}>💾 Commit Self Evaluation</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {isSyllabusDrawerOpen && (
        <View style={styles.overlay}>
          <View style={styles.drawerLarge}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
              <Text style={{ fontSize: 15, fontWeight: '700', color: '#2c3e50' }}>📐 Syllabus Topics Tracker</Text>
              <TouchableOpacity onPress={() => setIsSyllabusDrawerOpen(false)} style={styles.closeBtn}>
                <Text style={{ color: '#e74c3c', fontWeight: '700', fontSize: 12 }}>✕ Close Panel</Text>
              </TouchableOpacity>
            </View>
            <View style={{ flexDirection: 'row', gap: 6, marginBottom: 15 }}>
              {subjectOptions.map(sub => (
                <TouchableOpacity key={sub} style={{ backgroundColor: selectedFeedbackSubject === sub ? '#9b59b6' : '#f4f6f6', padding: 10, borderRadius: 6, flex: 1, alignItems: 'center' }} onPress={() => setSelectedFeedbackSubject(sub)}>
                  <Text style={{ color: selectedFeedbackSubject === sub ? '#fff' : '#2c3e50', fontWeight: '700', fontSize: 12 }}>{sub}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 20 }}>
              {syllabusProgress.filter(p => p.subject === selectedFeedbackSubject).map((p) => (
                <View key={p.id} style={{ backgroundColor: p.progress === 100 ? '#d4edda' : '#fcfcfc', padding: 12, borderRadius: 8, marginBottom: 8, borderWidth: 1, borderColor: p.progress === 100 ? '#2ecc71' : '#eaeded' }}>
                  <Text style={{ fontWeight: '700', color: p.progress === 100 ? '#155724' : '#2c3e50', fontSize: 13 }}>{p.name} ({p.level})</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#7f8c8d' }}>Mastery Scale: {p.progress}%</Text>
                    <View style={{ flexDirection: 'row', gap: 4 }}>
                      {[0, 25, 50, 75, 100].map((val) => (
                        <TouchableOpacity
                          key={val}
                          style={{ backgroundColor: (p.progress === val || (val === 100 && pendingConfidenceTopicId === p.id)) ? (val === 100 ? '#2ecc71' : '#34495e') : '#eaeded', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 }}
                          onPress={() => handleUpdateMastery(p.id, val)}
                        >
                          <Text style={{ color: (p.progress === val || (val === 100 && pendingConfidenceTopicId === p.id)) ? '#fff' : '#7f8c8d', fontSize: 10, fontWeight: '700' }}>{val}%</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                  {pendingConfidenceTopicId === p.id && (
                    <View style={{ marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#eaeded' }}>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: '#34495e', marginBottom: 6 }}>How confident are you with this topic?</Text>
                      <View style={{ flexDirection: 'row', gap: 5 }}>
                        {confidenceOptions.map(confidence => (
                          <TouchableOpacity
                            key={`${p.id}-${confidence}`}
                            style={{ backgroundColor: '#1abc9c', paddingHorizontal: 8, paddingVertical: 6, borderRadius: 4, flex: 1, alignItems: 'center' }}
                            onPress={() => handleUpdateMastery(p.id, 100, confidence)}
                          >
                            <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>{confidence}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  )}
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      )}

      {activeRevision && (
        <View style={styles.overlay}>
          <View style={styles.drawerLarge}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
              <Text style={{ fontSize: 15, fontWeight: '700', color: '#2c3e50' }}>🔁 Revision Simulator</Text>
              <TouchableOpacity onPress={closeRevisionPanel} style={styles.closeBtn}>
                <Text style={{ color: '#e74c3c', fontWeight: '700', fontSize: 12 }}>✕ Close Panel</Text>
              </TouchableOpacity>
            </View>
            <Text style={{ fontSize: 14, fontWeight: '700', color: '#34495e' }}>{activeRevision.name}</Text>
            <Text style={{ fontSize: 12, color: '#7f8c8d', marginTop: 4 }}>Subject: {activeRevision.subject}</Text>
            <Text style={{ fontSize: 12, color: revisionSecondsElapsed > (Number(activeRevision.max_time_minutes) || 90) * 60 ? '#e74c3c' : '#7f8c8d', fontWeight: '700', marginTop: 4 }}>Maximum Time: {activeRevision.max_time_minutes || 90} minutes{revisionSecondsElapsed > (Number(activeRevision.max_time_minutes) || 90) * 60 ? ' | Time Exceeded' : ''}</Text>
            <View style={{ backgroundColor: '#2c3e50', padding: 20, borderRadius: 10, alignItems: 'center', marginVertical: 10 }}>
              <Text style={{ color: '#fff', fontSize: 38, fontWeight: '700' }}>{`${Math.floor(revisionSecondsElapsed / 60).toString().padStart(2, '0')}:${(revisionSecondsElapsed % 60).toString().padStart(2, '0')}`}</Text>
              <View style={{ flexDirection: 'row', marginTop: 8 }}>
                <TouchableOpacity style={{ backgroundColor: revisionTimerInterval ? '#e67e22' : '#2ecc71', paddingHorizontal: 22, paddingVertical: 8, borderRadius: 5, marginRight: 10 }} onPress={toggleRevisionTimer}>
                  <Text style={{ color: '#fff', fontWeight: '700' }}>{revisionTimerInterval ? '⏸ Pause' : '▶ Start'}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={{ backgroundColor: '#7f8c8d', paddingHorizontal: 22, paddingVertical: 8, borderRadius: 5 }} onPress={resetRevisionTimer}>
                  <Text style={{ color: '#fff', fontWeight: '700' }}>🔄 Reset</Text>
                </TouchableOpacity>
              </View>
            </View>
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#2c3e50', marginBottom: 8 }}>Completion: {activeRevision.progress}%</Text>
            <View style={styles.row}>
              {[0, 25, 50, 75, 100].map(progress => (
                <TouchableOpacity key={progress} style={[styles.chip, activeRevision.progress === progress && styles.chipActive]} onPress={() => updateRevisionProgress(progress)}>
                  <Text style={styles.chipText}>{progress}%</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={{ fontSize: 11, color: '#7f8c8d', marginTop: 12 }}>Select 100% when revision is complete. The topic will be dismissed from your list and marked complete for your parent.</Text>
          </View>
        </View>
      )}

      {activeTest && (
        <View style={styles.overlay}>
          <View style={styles.drawerLarge}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
              <Text style={{ fontSize: 15, fontWeight: '700', color: '#2c3e50' }}>⏱️ Active Testing Simulator</Text>
              <TouchableOpacity onPress={closeExamPanel} style={styles.closeBtn}>
                <Text style={{ color: '#e74c3c', fontWeight: '700', fontSize: 12 }}>✕ Close Panel</Text>
              </TouchableOpacity>
            </View>
            <Text style={{ fontSize: 14, fontWeight: '700', color: '#34495e' }}>{activeTest.title || activeTest.name}</Text>
            <Text style={{ fontSize: 12, color: secondsElapsed > (Number(activeTest.maxTimeMinutes) || 90) * 60 ? '#e74c3c' : '#7f8c8d', fontWeight: '700', marginTop: 4 }}>Maximum Time: {activeTest.maxTimeMinutes || 90} minutes{secondsElapsed > (Number(activeTest.maxTimeMinutes) || 90) * 60 ? ' | Time Exceeded' : ''}</Text>
            <View style={{ backgroundColor: '#2c3e50', padding: 20, borderRadius: 10, alignItems: 'center', marginVertical: 10 }}>
              <Text style={{ color: '#fff', fontSize: 38, fontWeight: '700' }}>{`${Math.floor(secondsElapsed / 60).toString().padStart(2, '0')}:${(secondsElapsed % 60).toString().padStart(2, '0')}`}</Text>
              <View style={{ flexDirection: 'row', marginTop: 8 }}>
                <TouchableOpacity style={{ backgroundColor: timerInterval ? '#e67e22' : '#2ecc71', paddingHorizontal: 22, paddingVertical: 8, borderRadius: 5, marginRight: 10 }} onPress={toggleTestTimer}>
                  <Text style={{ color: '#fff', fontWeight: '700' }}>{timerInterval ? '⏸ Pause' : '▶ Start'}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={{ backgroundColor: '#7f8c8d', paddingHorizontal: 22, paddingVertical: 8, borderRadius: 5 }} onPress={resetTestTimer}>
                  <Text style={{ color: '#fff', fontWeight: '700' }}>🔄 Reset</Text>
                </TouchableOpacity>
              </View>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 }}>
              <TextInput style={[styles.input, { width: '45%' }]} placeholder="Scored" value={scoreInput} onChangeText={setScoreInput} keyboardType="number-pad" />
              <TextInput style={[styles.input, { width: '45%' }]} placeholder="Total" value="100" editable={false} keyboardType="number-pad" />
            </View>
            <TouchableOpacity style={styles.actionBtn} onPress={submitExamScore}>
              <Text style={styles.actionBtnText}>🏁 Complete and Sync Marks</Text>
            </TouchableOpacity>
          </View>
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
  sectionTitle: { fontSize: 16, color: '#2c3e50', fontWeight: 'bold', marginBottom: 8 },
  card: { backgroundColor: '#FFF', padding: 12, borderRadius: 8, marginBottom: 8, elevation: 1 },
  cardHeader: { fontSize: 14, fontWeight: '600', color: '#2c3e50', marginBottom: 6 },
  nodeText: { fontSize: 13, fontWeight: '600', color: '#2c3e50', marginBottom: 8 },
  actionBtn: { backgroundColor: '#1abc9c', padding: 10, borderRadius: 6, alignItems: 'center' },
  actionBtnText: { color: '#FFF', fontSize: 13, fontWeight: '700' },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  chip: { padding: 6, borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 4, flex: 1, alignItems: 'center', marginHorizontal: 2 },
  smallChip: { padding: 6, borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 4, marginRight: 6 },
  chipActive: { backgroundColor: '#eaf8f5', borderColor: '#1abc9c' },
  chipText: { fontSize: 11, color: '#2c3e50', fontWeight: '600' },
  input: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 6, padding: 8, marginBottom: 8, color: '#2c3e50' },
  modal: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFF' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#2c3e50', marginBottom: 12 },
  timer: { fontSize: 16, color: '#e74c3c', fontWeight: '700', marginBottom: 20 },
  emptyText: { color: '#95a5a6', fontStyle: 'italic', marginVertical: 10, fontSize: 13, textAlign: 'center' },
  cameraCard: { backgroundColor: '#34495e', padding: 20, borderRadius: 12 },
  cameraTitle: { fontSize: 15, color: '#fff', fontWeight: 'bold' },
  cameraInput: { backgroundColor: 'rgba(255,255,255,0.1)', color: '#fff', padding: 12, borderRadius: 6, marginVertical: 12, fontSize: 14 },
  cameraBtn: { backgroundColor: '#1abc9c', padding: 12, borderRadius: 6, alignItems: 'center' },
  syncBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#2c3e50', padding: 12, borderRadius: 8, gap: 10 },
  syncBtn: { backgroundColor: '#1abc9c', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 6 },
  pastTag: { backgroundColor: 'rgba(255,255,255,0.15)', padding: 5, borderRadius: 10, marginRight: 4 },
  evidenceChip: { backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: '#7f8c8d', paddingHorizontal: 8, paddingVertical: 6, borderRadius: 5, marginRight: 5 },
  evidenceChipActive: { backgroundColor: '#1abc9c', borderColor: '#1abc9c' },
  evidenceSelect: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: '#7f8c8d', paddingHorizontal: 10, paddingVertical: 9, borderRadius: 5, marginVertical: 6 },
  evidenceDropdown: { backgroundColor: '#fff', borderRadius: 5, marginBottom: 6, overflow: 'hidden' },
  evidenceOption: { paddingHorizontal: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#eaeded' },
  overlay: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end', zIndex: 20, flex: 1, display: 'flex' },
  drawer: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 22, height: '80%', maxHeight: '80%', minHeight: 0, width: '100%', overflow: 'hidden', display: 'flex' },
  drawerLarge: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 22, height: '85%', maxHeight: '85%', minHeight: 0, width: '100%', overflow: 'hidden', display: 'flex' },
  closeBtn: { backgroundColor: '#f4f6f6', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 15 }
});
