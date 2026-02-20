import React from 'react';
import { useTheme } from 'styled-components';
import {
  Assignment,
  Book,
  School,
  AccountCircle,
  Refresh as RefreshIcon,
  ViewModule,
  People
} from '@mui/icons-material';
import {
  HomeworkViewToggle,
  HomeworkToggleButton,
  HomeworkTableWrapper,
  HomeworkTableHeader,
  HomeworkHeaderTitle,
  HomeworkCollapsibleContent,
  HomeworkList,
  NoHomeworkData,
  HomeworkTable,
  HomeworkTableHead,
  HomeworkTableRow,
  HomeworkTableHeaderCell,
  HomeworkTableBody,
  HomeworkTableCell,
  HomeworkMobileList,
  HomeworkMobileCard,
  HomeworkMobileCardHeader,
  HomeworkMobileClass,
  HomeworkMobileSubject,
  HomeworkMobileDescription,
  HomeworkTeacherItem,
  HomeworkTeacherHeader,
  HomeworkClassItem,
  HomeworkClassHeader
} from '../../styles';
import { sortClasses } from '../../../../utils/classUtils';

interface HomeworkTabProps {
  showHomeworkDiary: boolean;
  homeworkViewMode: 'class' | 'teacher';
  setHomeworkViewMode: (mode: 'class' | 'teacher') => void;
  homeworkLoading: boolean;
  homeworkDiaryData: any[];
  dashboardDate: string;
}

const HomeworkTab: React.FC<HomeworkTabProps> = ({
  showHomeworkDiary,
  homeworkViewMode,
  setHomeworkViewMode,
  homeworkLoading,
  homeworkDiaryData,
  dashboardDate
}) => {
  const theme = useTheme() as any;
  const isDark = theme.BG === '#252525' || theme.BG === '#181c2a';

  if (!showHomeworkDiary) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '4rem 2rem',
        textAlign: 'center',
        color: isDark ? '#9ca3af' : '#6b7280'
      }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem', opacity: 0.7 }}>
          📝
        </div>
        <div style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '0.5rem' }}>
          Homework Diary Access Restricted
        </div>
        <div style={{ fontSize: '0.95rem', opacity: 0.8 }}>
          You don't have permission to view the homework diary
        </div>
      </div>
    );
  }

  return (
    <div style={{ width: '100%' }}>
      {homeworkLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
          <RefreshIcon style={{ fontSize: '2rem', animation: 'spin 1s linear infinite' }} />
        </div>
      ) : (
        <HomeworkTableWrapper>
          <HomeworkTableHeader>
            <HomeworkHeaderTitle>
              <Assignment style={{ fontSize: window.innerWidth <= 700 ? '1.1rem' : '1.3rem' }} />
              Homework Diary
            </HomeworkHeaderTitle>
            <HomeworkViewToggle>
              <HomeworkToggleButton
                $active={homeworkViewMode === 'class'}
                onClick={() => setHomeworkViewMode('class')}
              >
                <ViewModule style={{ fontSize: '1rem' }} />
                <span>Class View</span>
              </HomeworkToggleButton>
              <HomeworkToggleButton
                $active={homeworkViewMode === 'teacher'}
                onClick={() => setHomeworkViewMode('teacher')}
              >
                <People style={{ fontSize: '1rem' }} />
                <span>Teacher View</span>
              </HomeworkToggleButton>
            </HomeworkViewToggle>
          </HomeworkTableHeader>

          <HomeworkCollapsibleContent $expanded={true}>
            {(() => {
              if (homeworkDiaryData.length === 0) {
                return (
                  <NoHomeworkData>
                    <div style={{ fontSize: '2rem', marginBottom: '0.5rem', opacity: 0.7 }}>
                      📝
                    </div>
                    <div style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.3rem' }}>
                      No Homework Assigned
                    </div>
                    <div style={{ fontSize: '0.85rem', opacity: 0.8 }}>
                      No homework has been assigned for {new Date(dashboardDate).toLocaleDateString()}
                    </div>
                  </NoHomeworkData>
                );
              }

              // Group entries based on view mode
              if (homeworkViewMode === 'teacher') {
                // Group by teacher
                const teacherGroups: Record<string, any[]> = {};
                homeworkDiaryData.forEach((hw: any) => {
                  const teacherName = hw.users?.name || 'Unknown Teacher';
                  if (!teacherGroups[teacherName]) {
                    teacherGroups[teacherName] = [];
                  }
                  teacherGroups[teacherName].push(hw);
                });

                const groups = Object.entries(teacherGroups).sort(([a], [b]) => a.localeCompare(b));

                return (
                  <HomeworkList>
                    {groups.map(([teacherName, entries], groupIdx) => {
                      // Sort entries by class, then by subject
                      const sortedEntries = entries.sort((a: any, b: any) => {
                        const classA = a.classes?.name || '';
                        const classB = b.classes?.name || '';
                        if (classA !== classB) {
                          return classA.localeCompare(classB);
                        }
                        const subjectA = a.subjects?.name || '';
                        const subjectB = b.subjects?.name || '';
                        return subjectA.localeCompare(subjectB);
                      });

                      return (
                        <HomeworkTeacherItem key={groupIdx}>
                          <HomeworkTeacherHeader>
                            <AccountCircle style={{ fontSize: window.innerWidth <= 700 ? '0.9rem' : '1rem' }} />
                            <span>{teacherName}</span>
                            <span style={{
                              marginLeft: 'auto',
                              fontSize: window.innerWidth <= 700 ? '0.75rem' : '0.875rem',
                              fontWeight: 600,
                              color: '#6366f1',
                              backgroundColor: 'rgba(99,102,241,0.1)',
                              padding: window.innerWidth <= 700 ? '0.2rem 0.5rem' : '0.25rem 0.625rem',
                              borderRadius: window.innerWidth <= 700 ? '8px' : '12px',
                              whiteSpace: 'nowrap'
                            }}>
                              {sortedEntries.length} {sortedEntries.length === 1 ? 'Entry' : 'Entries'}
                            </span>
                          </HomeworkTeacherHeader>
                          
                          {/* Desktop: Table layout */}
                          <HomeworkTable>
                            <HomeworkTableBody>
                              {sortedEntries.map((entry: any, idx: number) => {
                                const classLabel = entry.classes?.name || 'Unknown Class';
                                const sectionLabel = entry.sections?.name ? ` (${entry.sections.name})` : '';
                                const subjectName = entry.subjects?.name || 'General Homework';
                                const isGeneral = !entry.subject_id;

                                return (
                                  <HomeworkTableRow key={idx}>
                                    <HomeworkTableCell>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <School style={{ fontSize: '0.875rem', opacity: 0.7 }} />
                                        {classLabel}{sectionLabel}
                                      </div>
                                    </HomeworkTableCell>
                                    <HomeworkTableCell>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        {isGeneral ? (
                                          <Assignment style={{ fontSize: '0.875rem', color: '#6366f1' }} />
                                        ) : (
                                          <Book style={{ fontSize: '0.875rem', color: '#6366f1' }} />
                                        )}
                                        {subjectName}
                                      </div>
                                    </HomeworkTableCell>
                                    <HomeworkTableCell>
                                      {entry.homework_text}
                                    </HomeworkTableCell>
                                  </HomeworkTableRow>
                                );
                              })}
                            </HomeworkTableBody>
                          </HomeworkTable>

                          {/* Mobile: Card-based layout */}
                          <HomeworkMobileList>
                            {sortedEntries.map((entry: any, idx: number) => {
                              const classLabel = entry.classes?.name || 'Unknown Class';
                              const sectionLabel = entry.sections?.name ? ` (${entry.sections.name})` : '';
                              const subjectName = entry.subjects?.name || 'General Homework';
                              const isGeneral = !entry.subject_id;

                              return (
                                <HomeworkMobileCard key={idx}>
                                  <HomeworkMobileCardHeader>
                                    <HomeworkMobileClass>
                                      <School style={{ fontSize: '0.875rem' }} />
                                      {classLabel}{sectionLabel}
                                    </HomeworkMobileClass>
                                    <HomeworkMobileSubject>
                                      {isGeneral ? (
                                        <Assignment style={{ fontSize: '0.875rem' }} />
                                      ) : (
                                        <Book style={{ fontSize: '0.875rem' }} />
                                      )}
                                      {subjectName}
                                    </HomeworkMobileSubject>
                                  </HomeworkMobileCardHeader>
                                  <HomeworkMobileDescription>
                                    {entry.homework_text}
                                  </HomeworkMobileDescription>
                                </HomeworkMobileCard>
                              );
                            })}
                          </HomeworkMobileList>
                        </HomeworkTeacherItem>
                      );
                    })}
                  </HomeworkList>
                );
              } else {
                // Group by class
                const grouped: Record<string, any> = {};
                homeworkDiaryData.forEach((hw: any) => {
                  const classId = hw.class_id;
                  const className = hw.classes?.name || 'Unknown Class';
                  const key = String(classId);

                  if (!grouped[key]) {
                    grouped[key] = {
                      class_id: classId,
                      class_name: className,
                      section_id: null,
                      section_name: '',
                      entries: []
                    };
                  }
                  grouped[key].entries.push(hw);
                });

                // Determine section names
                Object.values(grouped).forEach((group: any) => {
                  const sections = new Set();
                  group.entries.forEach((entry: any) => {
                    if (entry.section_id) {
                      sections.add(entry.section_id);
                    }
                  });
                  if (sections.size === 1) {
                    const sectionId = Array.from(sections)[0] as number;
                    const firstEntry = group.entries.find((e: any) => e.section_id === sectionId);
                    if (firstEntry) {
                      group.section_id = sectionId;
                      group.section_name = firstEntry.sections?.name || '';
                    }
                  }
                });

                // Get unique classes and sort them
                const uniqueClasses = Array.from(
                  new Map(
                    Object.values(grouped).map((g: any) => [g.class_id, { name: g.class_name }])
                  ).values()
                );
                const sortedClasses = sortClasses(uniqueClasses);
                const classSortOrder = new Map(
                  sortedClasses.map((cls, idx) => [cls.name, idx])
                );

                // Sort groups by class
                const groups = Object.values(grouped).sort((a: any, b: any) => {
                  const orderA = classSortOrder.get(a.class_name) ?? 999;
                  const orderB = classSortOrder.get(b.class_name) ?? 999;
                  return orderA - orderB;
                });

                return (
                  <HomeworkList>
                    {groups.map((group: any, groupIdx: number) => {
                      // Sort entries: general homework first, then by subject name
                      const sortedEntries = group.entries.sort((a: any, b: any) => {
                        if (!a.subject_id && !b.subject_id) return 0;
                        if (!a.subject_id) return -1;
                        if (!b.subject_id) return 1;
                        const aName = a.subjects?.name || '';
                        const bName = b.subjects?.name || '';
                        return aName.localeCompare(bName);
                      });

                      const classLabel = group.section_name
                        ? `${group.class_name} (${group.section_name})`
                        : group.class_name;

                      return (
                        <HomeworkClassItem key={groupIdx}>
                          <HomeworkClassHeader>
                            <School style={{ fontSize: window.innerWidth <= 700 ? '0.9rem' : '1rem' }} />
                            <span>{classLabel}</span>
                            <span style={{
                              marginLeft: 'auto',
                              fontSize: window.innerWidth <= 700 ? '0.75rem' : '0.875rem',
                              fontWeight: 600,
                              color: '#6366f1',
                              backgroundColor: 'rgba(99,102,241,0.1)',
                              padding: window.innerWidth <= 700 ? '0.2rem 0.5rem' : '0.25rem 0.625rem',
                              borderRadius: window.innerWidth <= 700 ? '8px' : '12px',
                              whiteSpace: 'nowrap'
                            }}>
                              {sortedEntries.length} {sortedEntries.length === 1 ? 'Entry' : 'Entries'}
                            </span>
                          </HomeworkClassHeader>

                          {/* Desktop: Table layout */}
                          <HomeworkTable>
                            <HomeworkTableBody>
                              {sortedEntries.map((entry: any, idx: number) => {
                                const subjectName = entry.subjects?.name || 'General Homework';
                                const isGeneral = !entry.subject_id;

                                return (
                                  <HomeworkTableRow key={idx}>
                                    <HomeworkTableCell>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        {entry.users?.name ? (
                                          <>
                                            <AccountCircle style={{ fontSize: '0.875rem', opacity: 0.7 }} />
                                            {entry.users.name}
                                          </>
                                        ) : (
                                          <span style={{ opacity: 0.5 }}>—</span>
                                        )}
                                      </div>
                                    </HomeworkTableCell>
                                    <HomeworkTableCell>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        {isGeneral ? (
                                          <Assignment style={{ fontSize: '0.875rem', color: '#6366f1' }} />
                                        ) : (
                                          <Book style={{ fontSize: '0.875rem', color: '#6366f1' }} />
                                        )}
                                        {subjectName}
                                      </div>
                                    </HomeworkTableCell>
                                    <HomeworkTableCell>
                                      {entry.homework_text}
                                    </HomeworkTableCell>
                                  </HomeworkTableRow>
                                );
                              })}
                            </HomeworkTableBody>
                          </HomeworkTable>

                          {/* Mobile: Card-based layout */}
                          <HomeworkMobileList>
                            {sortedEntries.map((entry: any, idx: number) => {
                              const subjectName = entry.subjects?.name || 'General Homework';
                              const isGeneral = !entry.subject_id;

                              return (
                                <HomeworkMobileCard key={idx}>
                                  <HomeworkMobileCardHeader>
                                    {entry.users?.name && (
                                      <HomeworkMobileClass>
                                        <AccountCircle style={{ fontSize: '0.875rem' }} />
                                        {entry.users.name}
                                      </HomeworkMobileClass>
                                    )}
                                    <HomeworkMobileSubject>
                                      {isGeneral ? (
                                        <Assignment style={{ fontSize: '0.875rem' }} />
                                      ) : (
                                        <Book style={{ fontSize: '0.875rem' }} />
                                      )}
                                      {subjectName}
                                    </HomeworkMobileSubject>
                                  </HomeworkMobileCardHeader>
                                  <HomeworkMobileDescription>
                                    {entry.homework_text}
                                  </HomeworkMobileDescription>
                                </HomeworkMobileCard>
                              );
                            })}
                          </HomeworkMobileList>
                        </HomeworkClassItem>
                      );
                    })}
                  </HomeworkList>
                );
              }
            })()}
          </HomeworkCollapsibleContent>
        </HomeworkTableWrapper>
      )}
    </div>
  );
};

export default HomeworkTab;

