import React, { useState } from 'react';
import { Text, View, TouchableOpacity } from 'react-native';
import Svg, { Circle, G, Path } from 'react-native-svg';
import { subjectChartColors } from './MetricsChartsTab';

const prelimsChartTypeOptions = ['Bar', 'Pie', 'Heatmap'];

export default function PrelimsExamTab({ subjectExamStats, cardStyle }) {
  const [chartType, setChartType] = useState('Bar');
  const slices = subjectExamStats.filter(stat => stat.averagePercentage !== null);

  return (
    <View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <Text style={{ fontSize: 13, fontWeight: '700', color: '#2c3e50' }}>📊 Prelims Average % by Subject</Text>
        <View style={{ flexDirection: 'row', backgroundColor: '#eaeded', borderRadius: 6, padding: 2 }}>
          {prelimsChartTypeOptions.map(type => (
            <TouchableOpacity key={type} style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 5, backgroundColor: chartType === type ? '#34495e' : 'transparent' }} onPress={() => setChartType(type)}>
              <Text style={{ fontSize: 10, fontWeight: '700', color: chartType === type ? '#fff' : '#2c3e50' }}>{type}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={{ backgroundColor: '#fcfcfc', padding: 12, borderRadius: 10, marginBottom: 15, borderWidth: 1, borderColor: '#eaeded' }}>
        {chartType === 'Bar' && (
          <View style={{ height: 140, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-around', borderBottomWidth: 2, borderBottomColor: '#bdc3c7', paddingBottom: 5 }}>
            {subjectExamStats.map(stat => (
              <View key={stat.subject} style={{ alignItems: 'center', width: '30%' }}>
                <Text style={{ fontSize: 10, color: stat.averagePercentage !== null ? subjectChartColors[stat.subject] : '#bdc3c7', marginBottom: 4 }}>{stat.averagePercentage !== null ? `${stat.averagePercentage.toFixed(0)}%` : '-'}</Text>
                <View style={{ height: `${stat.averagePercentage || 5}%`, width: 24, backgroundColor: stat.averagePercentage !== null ? subjectChartColors[stat.subject] : '#eaeded', borderRadius: 3 }} />
                <Text style={{ fontSize: 10, color: '#34495e', fontWeight: '700', marginTop: 6 }}>{stat.subject}</Text>
              </View>
            ))}
          </View>
        )}

        {chartType === 'Heatmap' && (
          <View>
            <View style={{ flexDirection: 'row' }}>
              <View style={{ width: 70 }} />
              <Text style={{ width: 64, fontSize: 9, fontWeight: '700', color: '#34495e', textAlign: 'center' }}>First</Text>
              <Text style={{ width: 64, fontSize: 9, fontWeight: '700', color: '#34495e', textAlign: 'center' }}>Latest</Text>
              <Text style={{ width: 64, fontSize: 9, fontWeight: '700', color: '#34495e', textAlign: 'center' }}>Change</Text>
            </View>
            {subjectExamStats.map(stat => {
              const firstPaper = stat.papers[0];
              const latestPaper = stat.papers[stat.papers.length - 1];
              const firstPct = firstPaper ? (Number(firstPaper.score) / Number(firstPaper.totalScore)) * 100 : null;
              const latestPct = latestPaper ? (Number(latestPaper.score) / Number(latestPaper.totalScore)) * 100 : null;
              const delta = firstPct !== null && latestPct !== null && stat.papers.length > 1 ? latestPct - firstPct : null;
              const cell = (pct) => (
                <View style={{ width: 64, height: 32, marginHorizontal: 2, borderRadius: 4, alignItems: 'center', justifyContent: 'center', backgroundColor: pct !== null ? subjectChartColors[stat.subject] : '#f4f6f6', opacity: pct !== null ? Math.max(0.15, Math.min(1, pct / 100)) : 1 }}>
                  <Text style={{ fontSize: 9, fontWeight: '700', color: pct !== null ? '#fff' : '#bdc3c7' }}>{pct !== null ? `${pct.toFixed(0)}%` : '-'}</Text>
                </View>
              );
              return (
                <View key={stat.subject} style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
                  <Text style={{ width: 70, fontSize: 10, fontWeight: '700', color: '#34495e' }}>{stat.subject}</Text>
                  {cell(firstPct)}
                  {cell(latestPct)}
                  <View style={{ width: 64, height: 32, marginHorizontal: 2, borderRadius: 4, alignItems: 'center', justifyContent: 'center', backgroundColor: delta === null ? '#f4f6f6' : delta > 0 ? '#eafaf1' : delta < 0 ? '#fdedec' : '#f4f6f6' }}>
                    <Text style={{ fontSize: 9, fontWeight: '700', color: delta === null ? '#bdc3c7' : delta > 0 ? '#27ae60' : delta < 0 ? '#e74c3c' : '#7f8c8d' }}>{delta === null ? '-' : `${delta > 0 ? '▲' : delta < 0 ? '▼' : '='} ${Math.abs(delta).toFixed(0)}%`}</Text>
                  </View>
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
      </View>

      <Text style={{ fontSize: 13, fontWeight: '700', color: '#2c3e50', marginBottom: 8 }}>🏆 Prelims Exam Marks & Subject AL</Text>
      <View style={{ marginBottom: 15 }}>
        {subjectExamStats.map(stat => (
          <View key={stat.subject} style={[cardStyle, { borderLeftWidth: 4, borderLeftColor: subjectChartColors[stat.subject], marginBottom: 6 }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontWeight: '700', color: '#2c3e50', fontSize: 12 }}>{stat.subject}</Text>
              <Text style={{ backgroundColor: stat.alGrade ? '#2ecc71' : '#bdc3c7', color: '#fff', fontWeight: '700', fontSize: 11, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 }}>{stat.alGrade || 'Ungraded'}</Text>
            </View>
            {stat.papers.length === 0 ? (
              <Text style={{ fontSize: 11, color: '#7f8c8d', marginTop: 4 }}>No completed prelim papers yet.</Text>
            ) : (
              <>
                <Text style={{ fontSize: 11, color: '#7f8c8d', marginTop: 4 }}>Average: {stat.averagePercentage.toFixed(1)}% across {stat.papers.length} paper{stat.papers.length > 1 ? 's' : ''}</Text>
                {stat.papers.map(paper => (
                  <Text key={paper.id} style={{ fontSize: 11, color: '#34495e', marginTop: 3 }}>• {paper.title || paper.name}: {paper.score} / {paper.totalScore} ({paper.alGrade}){paper.completionDate ? ` — completed ${new Date(paper.completionDate).toLocaleDateString()}` : ''}</Text>
                ))}
              </>
            )}
          </View>
        ))}
      </View>
    </View>
  );
}
