import React from 'react';
import { Text, View, TouchableOpacity } from 'react-native';

export const chartTypeOptions = ['Bar', 'Line'];
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

// Last 4 calendar months ending at the current month, so the chart always reflects recent activity.
function getRecentMonthNames() {
  const currentMonthIndex = new Date().getMonth();
  return Array.from({ length: 4 }, (_, i) => allMonthNames[(currentMonthIndex - 3 + i + 12) % 12]);
}

export default function MetricsChartsTab({ chartType, setChartType, feedbackRows, cardStyle }) {
  const recentMonths = getRecentMonthNames();
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
          <View style={{ height: 140, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-around', borderBottomWidth: 2, borderBottomColor: '#bdc3c7', paddingBottom: 5 }}>
            {recentMonths.map((mth) => {
              const mthShort = mth.slice(0, 3);
              const monthRecords = feedbackRows.filter(f => f.month === mth) || [];
              const getSubjectScore = (subName) => {
                const records = monthRecords.filter(f => f.subject === subName && Number.isFinite(Number(f.score)));
                if (records.length === 0) return 0;
                return records.reduce((total, record) => total + Number(record.score), 0) / records.length;
              };
              const sciScore = getSubjectScore('Science');
              const mathScore = getSubjectScore('Mathematics');
              const engScore = getSubjectScore('English');
              return (
                <View key={mthShort} style={{ alignItems: 'center', width: '22%' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 100, width: '100%', justifyContent: 'space-between', gap: 2 }}>
                    {[{ score: sciScore, color: '#1abc9c' }, { score: mathScore, color: '#9b59b6' }, { score: engScore, color: '#e67e22' }].map((item, index) => (
                      <View key={index} style={{ height: 100, justifyContent: 'flex-end', alignItems: 'center' }}>
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
        )}
        {chartType === 'Line' && (
          <View style={{ height: 140, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-around', borderBottomWidth: 2, borderBottomColor: '#bdc3c7', paddingBottom: 5 }}>
            {recentMonths.map((mth) => {
              const monthRecords = feedbackRows.filter(f => f.month === mth && Number.isFinite(Number(f.score))) || [];
              const average = monthRecords.length > 0 ? monthRecords.reduce((total, record) => total + Number(record.score), 0) / monthRecords.length : 0;
              return (
                <View key={mth} style={{ alignItems: 'center', width: '22%' }}>
                  <Text style={{ fontSize: 9, color: average ? '#2c3e50' : '#bdc3c7', marginBottom: 3 }}>{average ? average.toFixed(1) : '-'}</Text>
                  <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: average ? '#3498db' : '#eaeded' }} />
                  <View style={{ height: `${average || 3}%`, width: 2, backgroundColor: average ? '#3498db' : '#eaeded', marginTop: 4 }} />
                  <Text style={{ fontSize: 10, color: '#34495e', fontWeight: '700', marginTop: 6 }}>{mth.slice(0, 3)}</Text>
                </View>
              );
            })}
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
          <Text style={{ fontSize: 10, color: '#1abc9c' }}> Sci</Text>
          <Text style={{ fontSize: 10, color: '#9b59b6' }}> Math</Text>
          <Text style={{ fontSize: 10, color: '#e67e22' }}> Eng</Text>
        </View>
        <Text style={{ fontSize: 10, color: '#b9770e', fontStyle: 'italic', textAlign: 'center', marginTop: 8 }}>Bars show the average of School, Tuition, and Self marks. Student entries are listed below in amber.</Text>
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
