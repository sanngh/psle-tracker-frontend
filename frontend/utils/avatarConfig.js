// Static requires are required so the Metro bundler can resolve these images at build time.
export const PARENT_AVATARS = [
  { id: 'parent1', source: require('../assets/avatars/parent/parent1.png') },
  { id: 'parent2', source: require('../assets/avatars/parent/parent2.png') },
  { id: 'parent3', source: require('../assets/avatars/parent/parent3.png') },
  { id: 'parent4', source: require('../assets/avatars/parent/parent4.png') }
];

export const STUDENT_AVATARS = [
  { id: 'student1', source: require('../assets/avatars/student/student1.png') },
  { id: 'student2', source: require('../assets/avatars/student/student2.png') }
];

export const getAvatarsForRole = (role) => (role === 'parent' ? PARENT_AVATARS : STUDENT_AVATARS);

export const getAvatarSource = (role, avatarId) => {
  const list = getAvatarsForRole(role);
  const found = list.find(avatar => avatar.id === avatarId);
  return found ? found.source : list[0].source;
};
