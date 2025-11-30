import React from 'react';
import { useTheme } from 'styled-components';
import {
  Assignment,
  Book,
  School,
  AccountCircle,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import {
  HomeworkViewToggle,
  HomeworkTableWrapper,
  HomeworkTableHeader,
  HomeworkHeaderTitle,
  HomeworkCollapsibleContent,
  HomeworkList,
  NoHomeworkData,
  HomeworkTeacherItem,
  HomeworkTeacherHeader,
  HomeworkClassItem,
  HomeworkClassHeader,
  HomeworkSubjectItem,
  HomeworkSubjectName,
  HomeworkSubjectHeader,
  HomeworkText,
  HomeworkTeacher
} from '../../styles';

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
    <div>
      {/* View Toggle */}
      <div style={{
        display: 'flex',
        gap: '1rem',
        marginBottom: '1.5rem',
        alignItems: 'center',
        flexWrap: 'wrap',
        justifyContent: 'flex-end'
      }}>
        <HomeworkViewToggle>
          <button
            className={homeworkViewMode === 'class' ? 'active' : ''}
            onClick={() => setHomeworkViewMode('class')}
          >
            Class View
          </button>
          <button
            className={homeworkViewMode === 'teacher' ? 'active' : ''}
            onClick={() => setHomeworkViewMode('teacher')}
          >
            Teacher View
          </button>
        </HomeworkViewToggle>
      </div>

      {homeworkLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
          <RefreshIcon style={{ fontSize: '2rem', animation: 'spin 1s linear infinite' }} />
        </div>
      ) : homeworkViewMode === 'teacher' ? (
        <HomeworkTableWrapper>
          <HomeworkTableHeader>
            <HomeworkHeaderTitle>
              <Assignment style={{ fontSize: window.innerWidth <= 700 ? '1.1rem' : '1.3rem' }} />
              Homework Diary - Teacher View
            </HomeworkHeaderTitle>
          </HomeworkTableHeader>

          <HomeworkCollapsibleContent $expanded={true}>
            <HomeworkList>
              {(() => {
                // Group homework by teacher
                const teacherGroups: Record<string, any[]> = {};

                homeworkDiaryData.forEach((hw: any) => {
                  const teacherName = hw.users?.name || 'Unknown Teacher';
                  if (!teacherGroups[teacherName]) {
                    teacherGroups[teacherName] = [];
                  }
                  teacherGroups[teacherName].push(hw);
                });

                const groups = Object.entries(teacherGroups);

                if (groups.length === 0) {
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

                return groups
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([teacherName, entries], groupIdx) => {
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

                    const homeworkCount = sortedEntries.length;

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
                            border: '1px solid rgba(99,102,241,0.2)',
                            whiteSpace: 'nowrap'
                          }}>
                            {homeworkCount} {homeworkCount === 1 ? 'Entry' : 'Entries'}
                          </span>
                        </HomeworkTeacherHeader>
                        {sortedEntries.map((entry: any, entryIdx: number) => {
                          const classLabel = entry.classes?.name || 'Unknown Class';
                          const sectionLabel = entry.sections?.name ? ` (${entry.sections.name})` : '';
                          const subjectName = entry.subjects?.name || 'General Homework';
                          const isGeneral = !entry.subject_id;

                          return (
                            <HomeworkSubjectItem key={entryIdx}>
                              {window.innerWidth <= 700 ? (
                                <>
                                  <HomeworkSubjectHeader>
                                    <HomeworkSubjectName>
                                      {isGeneral ? (
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                          <Assignment style={{ fontSize: '0.75rem' }} />
                                          {subjectName}
                                        </span>
                                      ) : (
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                          <Book style={{ fontSize: '0.75rem' }} />
                                          {subjectName}
                                        </span>
                                      )}
                                    </HomeworkSubjectName>
                                    <HomeworkTeacher>
                                      <School style={{ fontSize: '0.7rem', opacity: 0.7 }} />
                                      {classLabel}{sectionLabel}
                                    </HomeworkTeacher>
                                  </HomeworkSubjectHeader>
                                  <HomeworkText>{entry.homework_text}</HomeworkText>
                                </>
                              ) : (
                                <>
                                  <HomeworkSubjectName>
                                    {isGeneral ? (
                                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                        <Assignment style={{ fontSize: '0.875rem' }} />
                                        {subjectName}
                                      </span>
                                    ) : (
                                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                        <Book style={{ fontSize: '0.875rem' }} />
                                        {subjectName}
                                      </span>
                                    )}
                                  </HomeworkSubjectName>
                                  <HomeworkText>{entry.homework_text}</HomeworkText>
                                  <HomeworkTeacher>
                                    <School style={{ fontSize: '0.875rem', opacity: 0.7 }} />
                                    {classLabel}{sectionLabel}
                                  </HomeworkTeacher>
                                </>
                              )}
                            </HomeworkSubjectItem>
                          );
                        })}
                      </HomeworkTeacherItem>
                    );
                  });
              })()}
            </HomeworkList>
          </HomeworkCollapsibleContent>
        </HomeworkTableWrapper>
      ) : (
        <HomeworkTableWrapper>
          <HomeworkTableHeader>
            <HomeworkHeaderTitle>
              <Assignment style={{ fontSize: window.innerWidth <= 700 ? '1.1rem' : '1.3rem' }} />
              Homework Diary - Class View
            </HomeworkHeaderTitle>
          </HomeworkTableHeader>

          <HomeworkCollapsibleContent $expanded={true}>
            <HomeworkList>
              {(() => {
                // Group homework by class only (combine all sections for the same class)
                const grouped: Record<string, any> = {};

                homeworkDiaryData.forEach((hw: any) => {
                  const classId = hw.class_id;
                  const className = hw.classes?.name || 'Unknown Class';

                  // Create key: just classId to group all sections together
                  const key = String(classId);

                  if (!grouped[key]) {
                    // For display, use the first section name if all entries have the same section
                    // Otherwise, show just the class name
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

                // After grouping, determine if all entries have the same section
                Object.values(grouped).forEach((group: any) => {
                  const sections = new Set();
                  group.entries.forEach((entry: any) => {
                    if (entry.section_id) {
                      sections.add(entry.section_id);
                    }
                  });

                  // If all entries have the same section, show it in the header
                  if (sections.size === 1) {
                    const sectionId = Array.from(sections)[0] as number;
                    const firstEntry = group.entries.find((e: any) => e.section_id === sectionId);
                    if (firstEntry) {
                      group.section_id = sectionId;
                      group.section_name = firstEntry.sections?.name || '';
                    }
                  }
                });

                const groups = Object.values(grouped);

                if (groups.length === 0) {
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

                return groups.map((group: any, groupIdx: number) => {
                  // Sort entries: general homework first (null subject), then by subject name
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
                  const diaryCount = sortedEntries.length;

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
                          border: '1px solid rgba(99,102,241,0.2)',
                          whiteSpace: 'nowrap'
                        }}>
                          {diaryCount} {diaryCount === 1 ? 'Entry' : 'Entries'}
                        </span>
                      </HomeworkClassHeader>
                      {sortedEntries.map((entry: any, entryIdx: number) => {
                        const subjectName = entry.subjects?.name || 'General Homework';
                        const isGeneral = !entry.subject_id;

                        return (
                          <HomeworkSubjectItem key={entryIdx}>
                            {window.innerWidth <= 700 ? (
                              <>
                                <HomeworkSubjectHeader>
                                  <HomeworkSubjectName>
                                    {isGeneral ? (
                                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                        <Assignment style={{ fontSize: '0.75rem' }} />
                                        {subjectName}
                                      </span>
                                    ) : (
                                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                        <Book style={{ fontSize: '0.75rem' }} />
                                        {subjectName}
                                      </span>
                                    )}
                                  </HomeworkSubjectName>
                                  <HomeworkTeacher>
                                    {entry.users?.name ? (
                                      <>
                                        <AccountCircle style={{ fontSize: '0.7rem', opacity: 0.7 }} />
                                        {entry.users.name}
                                      </>
                                    ) : (
                                      <span style={{ opacity: 0.5, fontSize: '0.7rem' }}>—</span>
                                    )}
                                  </HomeworkTeacher>
                                </HomeworkSubjectHeader>
                                <HomeworkText>{entry.homework_text}</HomeworkText>
                              </>
                            ) : (
                              <>
                                <HomeworkSubjectName>
                                  {isGeneral ? (
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                      <Assignment style={{ fontSize: '0.875rem' }} />
                                      {subjectName}
                                    </span>
                                  ) : (
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                      <Book style={{ fontSize: '0.875rem' }} />
                                      {subjectName}
                                    </span>
                                  )}
                                </HomeworkSubjectName>
                                <HomeworkText>{entry.homework_text}</HomeworkText>
                                <HomeworkTeacher>
                                  {entry.users?.name ? (
                                    <>
                                      <AccountCircle style={{ fontSize: '0.875rem', opacity: 0.7 }} />
                                      {entry.users.name}
                                    </>
                                  ) : (
                                    <span style={{ opacity: 0.5, fontSize: '0.75rem' }}>—</span>
                                  )}
                                </HomeworkTeacher>
                              </>
                            )}
                          </HomeworkSubjectItem>
                        );
                      })}
                    </HomeworkClassItem>
                  );
                });
              })()}
            </HomeworkList>
          </HomeworkCollapsibleContent>
        </HomeworkTableWrapper>
      )}
    </div>
  );
};

export default HomeworkTab;

