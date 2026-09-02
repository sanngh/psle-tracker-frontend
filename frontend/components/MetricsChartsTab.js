import React, { useState } from 'react';
import { Text, View, TouchableOpacity, ScrollView } from 'react-native';

export const chartTypeOptions = ['Bar', 'Heatmap'];
export const subjectChartColors = { Science: '#1abc9c', Mathematics: '#9b59b6', English: '#e67e22' };

// Mirrors backend calculateALGrade() thresholds so client-computed subject averages match server-graded single papers.
export function resolveALGrade(percentage) {
  if (!Number.isFinite(percentage)) return 'Ungraded';
  if (percentage >= 90) return 'AL 1';
  if (percentage >= 85) return 'AL 2';
  if (percentage >= 80) return 'AL 3';
  if (percentage >= 75) return 'AL 4';
  if (percentage >= 65) return 'AL 5';
  if (percentage >= 45) return 'AL 6';
  if (percentage >= 20) return 'AL 7';
  return 'AL 8';
}

const allMonthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

// January through the current calendar month, so the chart reflects the whole year to date.
function getRecentMonthNames() {
  const currentMonthIndex = new Date().getMonth();
  return allMonthNames.slice(0, currentMonthIndex + 1);
}

const subjectLegend = [{ subject: 'Science', short: 'Sci', color: '#1abc9c' }, { subject: 'Mathematics', short: 'Math', color: '#9b59b6' }, { subject: 'English', short: 'Eng', color: '#e67e22' }];

export default function MetricsChartsTab({ chartType, setChartType, feedbackRows, cardStyle }) {
  const recentMonths = getRecentMonthNames();
  const [selectedSubject, setSelectedSubject] = useState(null);
  return (
    <View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <Text style={{ fontSize: 13, fontWeight: '700', color: '#2c3e50' }}>📈 Grouped Performance Scale Chart</Text>
        <View style={{ flexDirection: 'row', backgroundColor: '#eaeded', borderRadius: 6, padding: 2 }}>
          {chartTypeOptions.map(type => (
            <TouchableOpacity key={type} style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 5, backgroundColor: chartType === type ? '#34495e' : 'transparent' }} onPress={() => setChartType(type)}>
              <Text style={{ fontSize: 10, fontWeight: '700', color: chartType === type ? '#fff' : '#2c3e50' }}>{type}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      <View style={{ backgroundColor: '#fcfcfc', padding: 12, borderRadius: 10, marginBottom: 15, borderWidth: 1, borderColor: '#eaeded' }}>
        {chartType === 'Bar' && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ height: 140, flexDirection: 'row', alignItems: 'flex-end', borderBottomWidth: 2, borderBottomColor: '#bdc3c7', paddingBottom: 5 }}>
              {recentMonths.map((mth) => {
                const mthShort = mth.slice(0, 3);
                const monthRecords = feedbackRows.filter(f => f.month === mth) || [];
                const getSubjectScore = (subName) => {
                  const records = monthRecords.filter(f => f.subject === subName && Number.isFinite(Number(f.score)));
                  if (records.length === 0) return 0;
                  return records.reduce((total, record) => total + Number(record.score), 0) / records.length;
                };
                const bars = subjectLegend
                  .filter(entry => !selectedSubject || selectedSubject === entry.subject)
                  .map(entry => ({ ...entry, score: getSubjectScore(entry.subject) }));
                return (
                  <View key={mthShort} style={{ alignItems: 'center', width: 60 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 100, width: '100%', justifyContent: 'space-between', gap: 2 }}>
                      {bars.map((item) => (
                        <View key={item.subject} style={{ height: 100, justifyContent: 'flex-end', alignItems: 'center' }}>
                          <Text style={{ fontSize: 8, color: item.score ? item.color : '#bdc3c7', marginBottom: 2 }}>{item.score ? item.score.toFixed(1) : '-'}</Text>
                          <View style={{ height: `${item.score || 5}%`, width: 7, backgroundColor: item.score ? item.color : '#eaeded', borderRadius: 2 }} />
                        </View>
                      ))}
                    </View>
                    <Text style={{ fontSize: 10, color: '#34495e', fontWeight: '700', marginTop: 6 }}>{mthShort}</Text>
                  </View>
                );
              })}
            </View>
          </ScrollView>
        )}
        {chartType === 'Heatmap' && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View>
              <View style={{ flexDirection: 'row' }}>
                <View style={{ width: 44 }} />
                {recentMonths.map((mth) => (
                  <Text key={mth} style={{ width: 36, fontSize: 9, fontWeight: '700', color: '#34495e', textAlign: 'center' }}>{mth.slice(0, 3)}</Text>
                ))}
              </View>
              {subjectLegend
                .filter(entry => !selectedSubject || selectedSubject === entry.subject)
                .map(entry => (
                  <View key={entry.subject} style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                    <Text style={{ width: 44, fontSize: 9, fontWeight: '700', color: entry.color }}>{entry.short}</Text>
                    {recentMonths.map((mth) => {
                      const records = feedbackRows.filter(f => f.month === mth && f.subject === entry.subject && Number.isFinite(Number(f.score)));
                      const score = records.length > 0 ? records.reduce((total, record) => total + Number(record.score), 0) / records.length : null;
                      const intensity = score !== null ? Math.max(0.15, Math.min(1, score / 100)) : 0;
                      return (
                        <View key={mth} style={{ width: 36, height: 28, marginHorizontal: 1, borderRadius: 4, alignItems: 'center', justifyContent: 'center', backgroundColor: score !== null ? entry.color : '#f4f6f6', opacity: score !== null ? intensity : 1 }}>
                          <Text style={{ fontSize: 8, fontWeight: '700', color: score !== null ? '#fff' : '#bdc3c7' }}>{score !== null ? score.toFixed(0) : '-'}</Text>
                        </View>
                      );
                    })}
                  </View>
                ))}
            </View>
          </ScrollView>
        )}
        {chartType === 'Pie' && (
          <View style={{ alignItems: 'center' }}>
            <Svg width={160} height={160} viewBox="0 0 160 160">
              <G>
                {(() => {
                  const radius = 70;
                  const cx = 80;
                  const cy = 80;
                  const slices = subjectExamStats.filter(stat => stat.averagePercentage !== null);
                  if (slices.length === 0) return <Circle cx={cx} cy={cy} r={radius} fill="#eaeded" />;
                  const total = slices.reduce((sum, stat) => sum + stat.averagePercentage, 0) || 1;
                  let startAngle = -Math.PI / 2;
                  return slices.map(stat => {
                    const sliceAngle = (stat.averagePercentage / total) * Math.PI * 2;
                    const endAngle = startAngle + sliceAngle;
                    const x1 = cx + radius * Math.cos(startAngle);
                    const y1 = cy + radius * Math.sin(startAngle);
                    const x2 = cx + radius * Math.cos(endAngle);
                    const y2 = cy + radius * Math.sin(endAngle);
                    const largeArcFlag = sliceAngle > Math.PI ? 1 : 0;
                    const path = `M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;
                    startAngle = endAngle;
                    return <Path key={stat.subject} d={path} fill={subjectChartColors[stat.subject]} />;
                  });
                })()}
              </G>
            </Svg>
            <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 10, marginTop: 10, flexWrap: 'wrap' }}>
              {subjectExamStats.map(stat => (
                <Text key={stat.subject} style={{ fontSize: 10, color: subjectChartColors[stat.subject], fontWeight: '700' }}>■ {stat.subject}: {stat.averagePercentage !== null ? `${stat.averagePercentage.toFixed(0)}%` : 'No data'}</Text>
              ))}
            </View>
          </View>
        )}
        {chartType === 'Pie' && (
          <View style={{ alignItems: 'center' }}>
            <Svg width={160} height={160} viewBox="0 0 160 160">
              <G>
                {(() => {
                  const radius = 70;
                  const cx = 80;
                  const cy = 80;
                  const slices = subjectExamStats.filter(stat => stat.averagePercentage !== null);
                  if (slices.length === 0) return <Circle cx={cx} cy={cy} r={radius} fill="#eaeded" />;
                  const total = slices.reduce((sum, stat) => sum + stat.averagePercentage, 0) || 1;
                  let startAngle = -Math.PI / 2;
                  return slices.map(stat => {
                    const sliceAngle = (stat.averagePercentage / total) * Math.PI * 2;
                    const endAngle = startAngle + sliceAngle;
                    const x1 = cx + radius * Math.cos(startAngle);
                    const y1 = cy + radius * Math.sin(startAngle);
                    const x2 = cx + radius * Math.cos(endAngle);
                    const y2 = cy + radius * Math.sin(endAngle);
                    const largeArcFlag = sliceAngle > Math.PI ? 1 : 0;
                    const path = `M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;
                    startAngle = endAngle;
                    return <Path key={stat.subject} d={path} fill={subjectChartColors[stat.subject]} />;
                  });
                })()}
              </G>
            </Svg>
            <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 10, marginTop: 10, flexWrap: 'wrap' }}>
              {subjectExamStats.map(stat => (
                <Text key={stat.subject} style={{ fontSize: 10, color: subjectChartColors[stat.subject], fontWeight: '700' }}>■ {stat.subject}: {stat.averagePercentage !== null ? `${stat.averagePercentage.toFixed(0)}%` : 'No data'}</Text>
              ))}
            </View>
          </View>
        )}
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 12, marginTop: 10 }}>
          {subjectLegend.map(entry => (
            <TouchableOpacity key={entry.subject} onPress={() => setSelectedSubject(selectedSubject === entry.subject ? null : entry.subject)} style={{ paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, backgroundColor: selectedSubject === entry.subject ? '#eaeded' : 'transparent' }}>
              <Text style={{ fontSize: 10, color: entry.color, fontWeight: selectedSubject === entry.subject ? '700' : '400' }}> {entry.short}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={{ fontSize: 10, color: '#b9770e', fontStyle: 'italic', textAlign: 'center', marginTop: 8 }}>Bars show the average of School, Tuition, and Self marks. Tap Sci/Math/Eng above to filter. Student entries are listed below in amber.</Text>
      </View>

      <Text style={{ fontSize: 13, fontWeight: '700', color: '#2c3e50', marginBottom: 8 }}>👨‍🏫 External Instructor Tracks</Text>
      {feedbackRows.filter(f => f.source !== 'Self').map((f, i) => (
        <View key={`t_${i}`} style={[cardStyle, { borderLeftWidth: 4, borderLeftColor: f.source === 'School' ? '#e67e22' : '#9b59b6', marginBottom: 6 }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ fontWeight: '700', fontSize: 12 }}>📅 {f.month} — {f.subject}</Text>
            <Text style={{ fontWeight: '700', fontSize: 11 }}>{f.score}/100</Text>
          </View>
          <Text style={{ fontStyle: 'italic', fontSize: 11, marginTop: 4 }}>" {f.remarks} "</Text>
        </View>
      ))}

      <Text style={{ fontSize: 13, fontWeight: '700', color: '#2c3e50', marginTop: 12, marginBottom: 8 }}>🎒 Child's Self-Reflections</Text>
      {feedbackRows.filter(f => f.source === 'Self').map((f, i) => (
        <View key={`s_${i}`} style={[cardStyle, { borderLeftWidth: 4, borderLeftColor: '#f39c12', backgroundColor: '#fff8e7', marginBottom: 6 }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ fontWeight: '700', color: '#b9770e', fontSize: 12 }}>🎒 Student Mark: {f.month} — {f.subject}</Text>
            <Text style={{ backgroundColor: '#f39c12', color: '#fff', fontSize: 11, paddingHorizontal: 6, paddingVertical: 3, borderRadius: 4 }}>Self: {f.score}%</Text>
          </View>
          <Text style={{ fontStyle: 'italic', fontSize: 11, marginTop: 4 }}>" {f.remarks} "</Text>
        </View>
      ))}
    </View>
  );
}
