import React, { useState } from 'react';
import { Text, View, TouchableOpacity, ScrollView } from 'react-native';
import Svg, { Circle, G, Path, Text as SvgText } from 'react-native-svg';
import { subjectChartColors } from './MetricsChartsTab';

const prelimsChartTypeOptions = ['Bar', 'Pie', 'Heatmap'];
const paperTypeMeta = [{ key: 'Paper1', label: 'Paper 1' }, { key: 'Paper2', label: 'Paper 2' }];

// Splits a subject's completed papers into Paper 1 / Paper 2 groups and averages each separately.
function getPaperTypeAverage(papers, paperType) {
  const matches = papers
    .filter(paper => (paper.paperType || 'Paper1') === paperType)
    .sort((first, second) => new Date(first.completionDate || 0) - new Date(second.completionDate || 0));
  if (matches.length === 0) return { average: null, papers: matches };
  const percentages = matches.map(paper => (Number(paper.score) / Number(paper.totalScore)) * 100);
  return { average: percentages.reduce((total, pct) => total + pct, 0) / percentages.length, papers: matches };
}

export default function PrelimsExamTab({ subjectExamStats, cardStyle }) {
  const [chartType, setChartType] = useState('Bar');
  const [expandedHeatSubject, setExpandedHeatSubject] = useState(null);
  const slices = subjectExamStats.filter(stat => stat.averagePercentage !== null);
  const paperSplitStats = subjectExamStats.map(stat => ({
    subject: stat.subject,
    paper1: getPaperTypeAverage(stat.papers, 'Paper1'),
    paper2: getPaperTypeAverage(stat.papers, 'Paper2'),
    customPapers: stat.papers.filter(paper => (paper.paperType || 'Paper1') === 'Custom')
  }));

  return (
    <View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <Text style={{ fontSize: 13, fontWeight: '700', color: '#2c3e50' }}>📊 Prelims Ave % by Sub — Paper 1 vs Paper 2</Text>
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
          <View style={{ height: 150, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-around', borderBottomWidth: 2, borderBottomColor: '#bdc3c7', paddingBottom: 5 }}>
            {paperSplitStats.map(stat => (
              <View key={stat.subject} style={{ alignItems: 'center', width: '30%' }}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 110, gap: 6 }}>
                  {[{ meta: paperTypeMeta[0], data: stat.paper1 }, { meta: paperTypeMeta[1], data: stat.paper2 }].map(({ meta, data }) => (
                    <View key={meta.key} style={{ alignItems: 'center' }}>
                      <Text style={{ fontSize: 8, color: data.average !== null ? subjectChartColors[stat.subject] : '#bdc3c7', marginBottom: 4 }}>{data.average !== null ? `${data.average.toFixed(0)}%` : '-'}</Text>
                      <View style={{ height: `${data.average || 5}%`, width: 18, backgroundColor: data.average !== null ? subjectChartColors[stat.subject] : '#eaeded', opacity: meta.key === 'Paper2' ? 0.55 : 1, borderRadius: 3 }} />
                    </View>
                  ))}
                </View>
                <Text style={{ fontSize: 10, color: '#34495e', fontWeight: '700', marginTop: 6 }}>{stat.subject}</Text>
                <Text style={{ fontSize: 8, color: '#7f8c8d', marginTop: 2 }}>■ P1  ▤ P2</Text>
              </View>
            ))}
          </View>
        )}

        {chartType === 'Heatmap' && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View>
              <View style={{ flexDirection: 'row' }}>
                <View style={{ width: 56 }} />
                <Text style={{ width: 52, fontSize: 9, fontWeight: '700', color: '#34495e', textAlign: 'center' }}>Paper 1</Text>
                <Text style={{ width: 52, fontSize: 9, fontWeight: '700', color: '#34495e', textAlign: 'center' }}>Paper 2</Text>
                <Text style={{ width: 52, fontSize: 9, fontWeight: '700', color: '#34495e', textAlign: 'center' }}>Diff</Text>
              </View>
              {paperSplitStats.map(stat => {
                const p1 = stat.paper1.average;
                const p2 = stat.paper2.average;
                const delta = p1 !== null && p2 !== null ? p2 - p1 : null;
                const isExpanded = expandedHeatSubject === stat.subject;
                const cell = (pct) => (
                  <View style={{ width: 52, height: 30, marginHorizontal: 2, borderRadius: 4, alignItems: 'center', justifyContent: 'center', backgroundColor: pct !== null ? subjectChartColors[stat.subject] : '#f4f6f6', opacity: pct !== null ? Math.max(0.15, Math.min(1, pct / 100)) : 1 }}>
                    <Text style={{ fontSize: 9, fontWeight: '700', color: pct !== null ? '#fff' : '#bdc3c7' }}>{pct !== null ? `${pct.toFixed(0)}%` : '-'}</Text>
                  </View>
                );
                const paperTrend = (papers, subject) => {
                  const pcts = papers.map(paper => (Number(paper.score) / Number(paper.totalScore)) * 100);
                  const width = Math.max(pcts.length * 34, 60);
                  const height = 50;
                  const topPad = 16;
                  const bottomPad = 14;
                  const chartHeight = height - topPad - bottomPad;
                  const stepX = pcts.length > 1 ? (width - 20) / (pcts.length - 1) : 0;
                  const yFor = (pct) => topPad + chartHeight * (1 - pct / 100);
                  const points = pcts.map((pct, i) => ({ x: 10 + i * stepX, y: yFor(pct), pct }));
                  const linePath = points.map((pt, i) => `${i === 0 ? 'M' : 'L'} ${pt.x} ${pt.y}`).join(' ');
                  const color = subjectChartColors[subject];
                  return (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      <Svg width={width} height={height + bottomPad}>
                        <Path d={linePath} stroke={color} strokeWidth={2} fill="none" />
                        {points.map((pt, i) => (
                          <G key={i}>
                            <Circle cx={pt.x} cy={pt.y} r={3} fill={color} />
                            <SvgText x={pt.x} y={pt.y - 6} fontSize={8} fontWeight="700" fill={color} textAnchor="middle">{`${pt.pct.toFixed(0)}%`}</SvgText>
                            <SvgText x={pt.x} y={height + bottomPad - 2} fontSize={8} fill="#95a5a6" textAnchor="middle">{`#${i + 1}`}</SvgText>
                          </G>
                        ))}
                      </Svg>
                    </ScrollView>
                  );
                };
                return (
                  <View key={stat.subject}>
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={() => setExpandedHeatSubject(isExpanded ? null : stat.subject)}
                      style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}
                    >
                      <Text style={{ width: 56, fontSize: 10, fontWeight: '700', color: '#34495e' }}>{isExpanded ? '▾ ' : '▸ '}{stat.subject}</Text>
                      {cell(p1)}
                      {cell(p2)}
                      <View style={{ width: 52, height: 30, marginHorizontal: 2, borderRadius: 4, alignItems: 'center', justifyContent: 'center', backgroundColor: delta === null ? '#f4f6f6' : delta > 0 ? '#eafaf1' : delta < 0 ? '#fdedec' : '#f4f6f6' }}>
                        <Text style={{ fontSize: 9, fontWeight: '700', color: delta === null ? '#bdc3c7' : delta > 0 ? '#27ae60' : delta < 0 ? '#e74c3c' : '#7f8c8d' }}>{delta === null ? '-' : `${delta > 0 ? '▲' : delta < 0 ? '▼' : '='} ${Math.abs(delta).toFixed(0)}%`}</Text>
                      </View>
                    </TouchableOpacity>
                    {isExpanded && (
                      <View style={{ marginLeft: 56, marginTop: 2, marginBottom: 4, paddingLeft: 8, borderLeftWidth: 2, borderLeftColor: '#eaeded' }}>
                        {stat.paper1.papers.length === 0 && stat.paper2.papers.length === 0 ? (
                          <Text style={{ fontSize: 9, color: '#bdc3c7' }}>No completed papers yet</Text>
                        ) : (
                          <>
                            {stat.paper1.papers.length > 0 && (
                              <>
                                <Text style={{ fontSize: 9, fontWeight: '700', color: '#34495e' }}>Paper 1 ({stat.paper1.papers.length} attempt{stat.paper1.papers.length === 1 ? '' : 's'})</Text>
                                {stat.paper1.papers.length >= 2 ? paperTrend(stat.paper1.papers) : (
                                  <Text style={{ fontSize: 9, color: '#7f8c8d', marginTop: 2 }}>Only 1 attempt — need at least 2 to show a trend</Text>
                                )}
                              </>
                            )}
                            {stat.paper2.papers.length > 0 && (
                              <>
                                <Text style={{ fontSize: 9, fontWeight: '700', color: '#34495e', marginTop: 6 }}>Paper 2 ({stat.paper2.papers.length} attempt{stat.paper2.papers.length === 1 ? '' : 's'})</Text>
                                {stat.paper2.papers.length >= 2 ? paperTrend(stat.paper2.papers) : (
                                  <Text style={{ fontSize: 9, color: '#7f8c8d', marginTop: 2 }}>Only 1 attempt — need at least 2 to show a trend</Text>
                                )}
                              </>
                            )}
                          </>
                        )}
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          </ScrollView>
        )}

        {chartType === 'Pie' && (
          <View style={{ flexDirection: 'row', justifyContent: 'space-around', flexWrap: 'wrap' }}>
            {paperTypeMeta.map(meta => {
              const paperSlices = paperSplitStats
                .map(stat => ({ subject: stat.subject, average: meta.key === 'Paper1' ? stat.paper1.average : stat.paper2.average }))
                .filter(entry => entry.average !== null);
              const total = paperSlices.reduce((sum, entry) => sum + entry.average, 0) || 1;
              let startAngle = -Math.PI / 2;
              const radius = 55;
              const cx = 60;
              const cy = 60;
              return (
                <View key={meta.key} style={{ alignItems: 'center', marginBottom: 12 }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#2c3e50', marginBottom: 4 }}>{meta.label}</Text>
                  <Svg width={120} height={120} viewBox="0 0 120 120">
                    <G>
                      {paperSlices.length === 0
                        ? <Circle cx={cx} cy={cy} r={radius} fill="#eaeded" />
                        : paperSlices.map(entry => {
                            const sliceAngle = (entry.average / total) * Math.PI * 2;
                            const endAngle = startAngle + sliceAngle;
                            const x1 = cx + radius * Math.cos(startAngle);
                            const y1 = cy + radius * Math.sin(startAngle);
                            const x2 = cx + radius * Math.cos(endAngle);
                            const y2 = cy + radius * Math.sin(endAngle);
                            const largeArcFlag = sliceAngle > Math.PI ? 1 : 0;
                            const path = `M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;
                            startAngle = endAngle;
                            return <Path key={entry.subject} d={path} fill={subjectChartColors[entry.subject]} />;
                          })}
                    </G>
                  </Svg>
                  <View style={{ marginTop: 6 }}>
                    {paperSlices.length === 0
                      ? <Text style={{ fontSize: 9, color: '#bdc3c7' }}>No data</Text>
                      : paperSlices.map(entry => (
                          <Text key={entry.subject} style={{ fontSize: 9, color: subjectChartColors[entry.subject], fontWeight: '700' }}>■ {entry.subject}: {entry.average.toFixed(0)}%</Text>
                        ))}
                  </View>
                </View>
              );
            })}
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
                  <Text key={paper.id} style={{ fontSize: 11, color: '#34495e', marginTop: 3 }}>• [{paper.paperType === 'Paper2' ? 'P2' : paper.paperType === 'Custom' ? 'Custom' : 'P1'}] {paper.title || paper.name}: {paper.score} / {paper.totalScore} ({paper.alGrade}){paper.completionDate ? ` — completed ${new Date(paper.completionDate).toLocaleDateString()}` : ''}</Text>
                ))}
              </>
            )}
          </View>
        ))}
      </View>
    </View>
  );
}
