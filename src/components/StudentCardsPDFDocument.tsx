import React from 'react';
import { Document, Page, View, Text, Image, StyleSheet, Svg, Path, Font } from '@react-pdf/renderer';
import { getStudentDisplayId } from '../utils/studentUtils';

// Register fonts if needed. We will use default fonts for now, but to be safe with bold,
// it is sometimes better to register a font. For this, we'll just use the built-in 
// Helvetica / Helvetica-Bold since it's universally available in PDFs.

const styles = StyleSheet.create({
    page: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        backgroundColor: '#ffffff',
        padding: 10,
        justifyContent: 'center',
        gap: 10,
    },
    card: {
        width: '3.375in',
        height: '2.125in',
        backgroundColor: '#ffffff',
        border: '1px solid #e5e7eb',
        position: 'relative',
        overflow: 'hidden',
        marginBottom: 10,
        marginRight: 10,
    },
    cardBackgroundSvg: {
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
    },
    bottomBorder: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        width: '100%',
        height: 5,
        backgroundColor: '#4ab44b',
    },
    contentWrapper: {
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
    },
    headerContent: {
        width: '100%',
        height: 44,
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 3,
        paddingRight: 10,
        paddingLeft: 10,
    },
    logoWrapper: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: '#ffffff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 10,
        overflow: 'hidden',
    },
    logo: {
        width: 36,
        height: 36,
        borderRadius: 18,
        objectFit: 'contain',
    },
    headerTextCol: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 0,
        flex: 1,
        color: '#ffffff',
        marginLeft: 8,
    },
    schoolName: {
        fontSize: 10,
        fontFamily: 'Helvetica-Bold',
        fontWeight: 800,
        letterSpacing: 0.5,
        textTransform: 'uppercase',
        textAlign: 'center',
        width: '100%',
    },
    schoolAddress: {
        fontSize: 5.5,
        fontFamily: 'Helvetica',
        fontWeight: 600,
        letterSpacing: 0.5,
        marginTop: 2,
        color: '#e5e7eb',
        textAlign: 'center',
        width: '100%',
    },
    cardBody: {
        flex: 1,
        paddingTop: 16,
        paddingLeft: 10,
        paddingRight: 5,
        display: 'flex',
        flexDirection: 'row',
    },
    leftSection: {
        width: 70,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        marginTop: 0,
    },
    photoContainer: {
        width: 52,
        height: 62,
        borderRadius: 6,
        backgroundColor: '#e5e7eb',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    photo: {
        width: '100%',
        height: '100%',
        objectFit: 'cover',
    },
    signatureSection: {
        marginTop: 'auto',
        marginBottom: 8,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
    },
    signatureLine: {
        width: 50,
        height: 2,
        borderBottom: '1px solid #1f2937',
        marginBottom: 2,
    },
    signatureText: {
        fontSize: 6,
        fontFamily: 'Helvetica-Bold',
        color: '#1a1835',
    },
    rightSection: {
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        paddingLeft: 12,
        paddingTop: 0,
    },
    idPillWrapper: {
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'center',
        marginBottom: 10,
        marginLeft: -12,
    },
    idPill: {
        backgroundColor: '#d32f2f',
        color: '#ffffff',
        fontSize: 7,
        fontFamily: 'Helvetica-Bold',
        paddingVertical: 2,
        paddingHorizontal: 8,
        borderRadius: 10,
    },
    infoGrid: {
        display: 'flex',
        flexDirection: 'column',
        gap: 3,
    },
    infoRow: {
        display: 'flex',
        flexDirection: 'row',
        fontSize: 7.5,
        alignItems: 'center',
    },
    infoLabel: {
        width: 38,
        fontFamily: 'Helvetica-Bold',
        color: '#1a1835',
    },
    infoSeparator: {
        width: 6,
        color: '#1a1835',
        fontFamily: 'Helvetica-Bold',
        textAlign: 'center',
    },
    infoValue: {
        flex: 1,
        fontFamily: 'Helvetica-Bold',
        color: '#374151',
    },
    infoValueHighlight: {
        flex: 1,
        fontFamily: 'Helvetica-Bold',
        color: '#d32f2f',
    }
});

interface StudentCardsPDFDocumentProps {
    students: any[];
    schoolProfile: any;
    classes: any[];
    sections: any[];
}

const StudentCardsPDFDocument: React.FC<StudentCardsPDFDocumentProps> = ({
    students,
    schoolProfile,
    classes,
    sections
}) => {
    // A4 size is around 595 x 842 points.
    // One card is ~ 243 x 153 points.

    return (
        <Document>
            <Page size="A4" style={styles.page}>
                {students.map((student) => {
                    const studentClass = classes.find(c => c.id === student.class_id);
                    const studentSection = student.section_id ? sections.find(s => s.id === student.section_id) : null;
                    const classText = studentClass?.name || '-';
                    const sectionText = studentSection ? `(${studentSection.name})` : '';
                    const fullClassText = `${classText} ${sectionText}`.trim();

                    return (
                        <View key={student.id} style={styles.card} wrap={false}>
                            {/* 1. Draw Background Shapes First */}
                            <View style={styles.cardBackgroundSvg}>
                                <Svg viewBox="0 0 243 153" style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }} preserveAspectRatio="none">
                                    <Path d="M -5 -5 L 248 -5 L 248 44 Q 120 72 -5 38 Z" fill="#2cb742" />
                                    <Path d="M -5 -5 L 248 -5 L 248 43 Q 120 62 -5 33 Z" fill="#191636" />
                                </Svg>
                            </View>
                            <View style={styles.bottomBorder} />

                            {/* 2. Draw Content Layer Over Background */}
                            <View style={styles.contentWrapper}>
                                <View style={styles.headerContent}>
                                    {schoolProfile?.logo_url && (
                                        <View style={styles.logoWrapper}>
                                            <Image style={styles.logo} src={schoolProfile.logo_url} />
                                        </View>
                                    )}
                                    <View style={styles.headerTextCol}>
                                        <Text style={styles.schoolName}>{schoolProfile?.name || 'YOUR SCHOOL NAME HERE'}</Text>
                                        <Text style={styles.schoolAddress}>{schoolProfile?.address || 'YOUR SCHOOL ADDRESS HERE'}</Text>
                                    </View>
                                </View>

                                <View style={styles.cardBody}>
                                    <View style={styles.leftSection}>
                                        <View style={styles.photoContainer}>
                                            {student.picture_url ? (
                                                <Image style={styles.photo} src={student.picture_url} />
                                            ) : (
                                                <View style={{ width: '100%', height: '100%', backgroundColor: '#cccccc' }} />
                                            )}
                                        </View>

                                        <View style={styles.signatureSection}>
                                            <View style={styles.signatureLine} />
                                            <Text style={styles.signatureText}>Principal</Text>
                                        </View>
                                    </View>

                                    <View style={styles.rightSection}>
                                        <View style={styles.idPillWrapper}>
                                            <View style={styles.idPill}>
                                                <Text>IDENTITY CARD</Text>
                                            </View>
                                        </View>

                                        <View style={styles.infoGrid}>
                                            <View style={styles.infoRow}>
                                                <Text style={styles.infoLabel}>Name</Text>
                                                <Text style={styles.infoSeparator}>:</Text>
                                                <Text style={styles.infoValueHighlight}>{student.name}</Text>
                                            </View>
                                            <View style={styles.infoRow}>
                                                <Text style={styles.infoLabel}>Father</Text>
                                                <Text style={styles.infoSeparator}>:</Text>
                                                <Text style={styles.infoValue}>{student.father_name || '-'}</Text>
                                            </View>
                                            <View style={styles.infoRow}>
                                                <Text style={styles.infoLabel}>Class</Text>
                                                <Text style={styles.infoSeparator}>:</Text>
                                                <Text style={styles.infoValue}>{fullClassText}</Text>
                                            </View>
                                            <View style={styles.infoRow}>
                                                <Text style={styles.infoLabel}>DOB</Text>
                                                <Text style={styles.infoSeparator}>:</Text>
                                                <Text style={styles.infoValue}>{student.dob ? new Date(student.dob).toLocaleDateString() : '-'}</Text>
                                            </View>
                                            <View style={styles.infoRow}>
                                                <Text style={styles.infoLabel}>Roll No.</Text>
                                                <Text style={styles.infoSeparator}>:</Text>
                                                <Text style={styles.infoValue}>{getStudentDisplayId({ id: student.id, roll_number: student.roll_number })}</Text>
                                            </View>
                                            {(student.guardian_phone || student.emergency_contact) && (
                                                <View style={styles.infoRow}>
                                                    <Text style={styles.infoLabel}>Contact No.</Text>
                                                    <Text style={styles.infoSeparator}>:</Text>
                                                    <Text style={styles.infoValue}>{student.guardian_phone || student.emergency_contact}</Text>
                                                </View>
                                            )}
                                        </View>
                                    </View>
                                </View>
                            </View>
                        </View>
                    );
                })}
            </Page>
        </Document>
    );
};

export default StudentCardsPDFDocument;
