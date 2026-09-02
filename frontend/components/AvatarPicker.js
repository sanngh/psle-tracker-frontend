import React from 'react';
import { Modal, View, Text, TouchableOpacity, Image, FlatList, StyleSheet } from 'react-native';
import { getAvatarsForRole } from '../utils/avatarConfig';

export default function AvatarPicker({ visible, role, currentAvatarId, onSelect, onClose }) {
  const avatars = getAvatarsForRole(role);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <Text style={styles.title}>Choose Your Avatar</Text>
          <FlatList
            data={avatars}
            keyExtractor={item => item.id}
            numColumns={3}
            contentContainerStyle={styles.grid}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.avatarWrap, currentAvatarId === item.id && styles.avatarWrapSelected]}
                onPress={() => onSelect(item.id)}
              >
                <Image source={item.source} style={styles.avatarImg} />
              </TouchableOpacity>
            )}
          />
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeBtnText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 20, maxHeight: '70%' },
  title: { fontSize: 16, fontWeight: '700', color: '#1F2937', marginBottom: 12, textAlign: 'center' },
  grid: { paddingBottom: 12 },
  avatarWrap: { flex: 1 / 3, aspectRatio: 1, margin: 6, borderRadius: 12, borderWidth: 3, borderColor: 'transparent', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', backgroundColor: '#f3f4f6' },
  avatarWrapSelected: { borderColor: '#1abc9c' },
  avatarImg: { width: '100%', height: '100%' },
  closeBtn: { marginTop: 8, alignItems: 'center', padding: 12 },
  closeBtnText: { color: '#6B7280', fontWeight: '700' }
});
