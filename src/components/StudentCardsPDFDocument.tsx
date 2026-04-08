import React from 'react';
import { Document, Page, View, Text, Image, StyleSheet, Svg, Path, Font } from '@react-pdf/renderer';
import { getStudentDisplayId } from '../utils/studentUtils';

const SAMPLE_MODERN_BLUE = '#4AA9D8';
const SAMPLE_MODERN_BLUE_LIGHT = '#BFE8FB';
const SAMPLE_MODERN_NAME = '#43AEE3';
const MODERN_BRAND_TITLE = 'AL-HARAM';
const MODERN_BRAND_SUBTITLE = 'Public School & Iqra Academy';
const MODERN_CARD_WIDTH = 158.4;
const MODERN_CARD_HEIGHT = 252;
const MODERN_HEADER_HEIGHT = 105.8;
const MODERN_OUTLINE_LEFT = 7.5;
const MODERN_OUTLINE_BOTTOM = 7.5;
const MODERN_PHOTO_TOP = 75.8;
const MODERN_PHOTO_LEFT = 29.7;
const MODERN_PHOTO_WIDTH = 99;
const MODERN_PHOTO_HEIGHT = 115.5;
const MODERN_NAME_TOP = 200.3;
const MODERN_ID_BADGE_TOP = 64.3;

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
        gap: 4,
    },
    card: {
        width: '3.375in',
        height: '2.125in',
        backgroundColor: '#ffffff',
        border: '1px solid #e5e7eb',
        position: 'relative',
        overflow: 'hidden',
        marginBottom: 2,
        marginRight: 4,
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
    colorScheme?: {
        topCurve: string;
        mainCurve: string;
        bottomBorder: string;
        idPill: string;
        nameHighlight: string;
    };
    designVariant?: 'classic' | 'modern';
}

const getModernNameBadgePdfStyle = (name: string) => {
    const length = name.trim().length;

    if (length >= 24) {
        return {
            fontSize: 6.8,
            paddingLeft: 7.5,
            paddingRight: 7.5,
            paddingTop: 4.5,
            paddingBottom: 4.5,
            maxWidth: 112.5,
        };
    }

    if (length >= 20) {
        return {
            fontSize: 7.5,
            paddingLeft: 9,
            paddingRight: 9,
            paddingTop: 4.5,
            paddingBottom: 4.5,
            maxWidth: 109.5,
        };
    }

    if (length >= 16) {
        return {
            fontSize: 8.3,
            paddingLeft: 10.5,
            paddingRight: 10.5,
            paddingTop: 4.5,
            paddingBottom: 4.5,
            maxWidth: 105,
        };
    }

    return {
        fontSize: 10.5,
        paddingLeft: 12,
        paddingRight: 12,
        paddingTop: 4.5,
        paddingBottom: 4.5,
        maxWidth: 99,
    };
};

const StudentCardsPDFDocument: React.FC<StudentCardsPDFDocumentProps> = ({
    students,
    schoolProfile,
    classes,
    sections,
    colorScheme,
    designVariant = 'classic',
}) => {
    const activeColors = {
        topCurve: colorScheme?.topCurve || '#2cb742',
        mainCurve: colorScheme?.mainCurve || '#191636',
        bottomBorder: colorScheme?.bottomBorder || '#4ab44b',
        idPill: colorScheme?.idPill || '#d32f2f',
        nameHighlight: colorScheme?.nameHighlight || '#d32f2f',
    };

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
                    const cardStyle = designVariant === 'modern'
                        ? {
                            ...styles.card,
                            width: MODERN_CARD_WIDTH,
                            height: MODERN_CARD_HEIGHT,
                            borderRadius: 18,
                        }
                        : styles.card;
                    const modernNameStyle = getModernNameBadgePdfStyle(student.name || '');

                    return (
                        <View key={student.id} style={cardStyle} wrap={false}>
                            {designVariant === 'modern' ? (
                                <>
                                    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#f3f4f6' }} />
                                    <View style={{ position: 'absolute', top: 6, left: 4, right: 4, height: MODERN_HEADER_HEIGHT, backgroundColor: 'rgba(15, 23, 42, 0.16)', borderBottomLeftRadius: 34, borderBottomRightRadius: 34 }} />
                                    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: MODERN_HEADER_HEIGHT, backgroundColor: SAMPLE_MODERN_BLUE, borderBottomLeftRadius: 34, borderBottomRightRadius: 34 }} />
                                    <View style={[styles.contentWrapper, { paddingTop: 0, paddingLeft: 0, paddingRight: 0, paddingBottom: 0, alignItems: 'center' }]}>
                                        {[0, 8, 16].map((offset, index) => (
                                            <View
                                                key={`modern-outline-${index}`}
                                                style={{
                                                    position: 'absolute',
                                                    left: MODERN_OUTLINE_LEFT + (offset * 0.75),
                                                    right: MODERN_OUTLINE_LEFT + (offset * 0.75),
                                                    top: MODERN_HEADER_HEIGHT + (offset * 0.75),
                                                    bottom: MODERN_OUTLINE_BOTTOM + (offset * 0.75),
                                                    borderLeft: `1.5px solid ${SAMPLE_MODERN_BLUE_LIGHT}`,
                                                    borderRight: `1.5px solid ${SAMPLE_MODERN_BLUE_LIGHT}`,
                                                    borderBottom: `1.5px solid ${SAMPLE_MODERN_BLUE_LIGHT}`,
                                                    borderBottomLeftRadius: 19.5 - (index * 3),
                                                    borderBottomRightRadius: 19.5 - (index * 3),
                                                    opacity: 0.95 - (index * 0.18),
                                                }}
                                            />
                                        ))}
                                        <View style={{ position: 'absolute', top: 3, left: 9, width: MODERN_CARD_WIDTH - 18, display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
                                            {schoolProfile?.logo_url && (
                                                <Image style={{ width: 26.25, height: 26.25, objectFit: 'contain', marginRight: 6, border: '0.75px solid #ffffff', borderRadius: 13.5 }} src={schoolProfile.logo_url} />
                                            )}
                                            <View style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'center', marginTop: -1 }}>
                                                <Text style={{ fontSize: 19.3, fontFamily: 'Helvetica-Bold', color: '#ffffff', textTransform: 'uppercase', textAlign: 'left', lineHeight: 0.95 }}>{MODERN_BRAND_TITLE}</Text>
                                                <Text style={{ fontSize: 7.9, fontFamily: 'Helvetica-Bold', color: '#ffffff', textAlign: 'left', lineHeight: 1.05 }}>{MODERN_BRAND_SUBTITLE}</Text>
                                            </View>
                                        </View>
                                        <View style={{ position: 'absolute', top: MODERN_ID_BADGE_TOP, left: 0, right: 0, zIndex: 5, display: 'flex', alignItems: 'center' }}>
                                            <View style={{ position: 'absolute', top: 2, paddingTop: 3, paddingBottom: 3, paddingLeft: 9, paddingRight: 9, borderRadius: 999, backgroundColor: 'rgba(15, 23, 42, 0.10)' }} />
                                            <View style={{ paddingTop: 3, paddingBottom: 3, paddingLeft: 9, paddingRight: 9, borderRadius: 999, backgroundColor: '#ffffff', border: `1.125px solid ${SAMPLE_MODERN_BLUE_LIGHT}` }}>
                                                <Text style={{ fontSize: 4.8, fontFamily: 'Helvetica-Bold', color: SAMPLE_MODERN_NAME, letterSpacing: 0.5, textTransform: 'uppercase', textAlign: 'center' }}>Student ID Card</Text>
                                            </View>
                                        </View>
                                        <View style={{ position: 'absolute', top: MODERN_PHOTO_TOP + 10, left: MODERN_PHOTO_LEFT + 8, width: MODERN_PHOTO_WIDTH, height: MODERN_PHOTO_HEIGHT, borderTopLeftRadius: 18, borderTopRightRadius: 0, borderBottomRightRadius: 22.5, borderBottomLeftRadius: 0, backgroundColor: 'rgba(15, 23, 42, 0.05)' }} />
                                        <View style={{ position: 'absolute', top: MODERN_PHOTO_TOP + 7, left: MODERN_PHOTO_LEFT + 5, width: MODERN_PHOTO_WIDTH, height: MODERN_PHOTO_HEIGHT, borderTopLeftRadius: 18, borderTopRightRadius: 0, borderBottomRightRadius: 22.5, borderBottomLeftRadius: 0, backgroundColor: 'rgba(15, 23, 42, 0.08)' }} />
                                        <View style={{ position: 'absolute', top: MODERN_PHOTO_TOP + 4, left: MODERN_PHOTO_LEFT + 3, width: MODERN_PHOTO_WIDTH, height: MODERN_PHOTO_HEIGHT, borderTopLeftRadius: 18, borderTopRightRadius: 0, borderBottomRightRadius: 22.5, borderBottomLeftRadius: 0, backgroundColor: 'rgba(15, 23, 42, 0.11)' }} />
                                        <View style={{ position: 'absolute', top: MODERN_PHOTO_TOP, left: MODERN_PHOTO_LEFT, width: MODERN_PHOTO_WIDTH, height: MODERN_PHOTO_HEIGHT, borderTopLeftRadius: 18, borderTopRightRadius: 0, borderBottomRightRadius: 22.5, borderBottomLeftRadius: 0, padding: 3, backgroundColor: '#ffffff' }}>
                                            <View style={{ width: '100%', height: '100%', borderTopLeftRadius: 15, borderTopRightRadius: 0, borderBottomRightRadius: 19.5, borderBottomLeftRadius: 0, overflow: 'hidden', backgroundColor: '#e5e7eb' }}>
                                                {student.picture_url ? (
                                                    <Image style={{ width: '100%', height: '100%', objectFit: 'cover' }} src={student.picture_url} />
                                                ) : (
                                                    <View style={{ width: '100%', height: '100%', backgroundColor: '#cccccc' }} />
                                                )}
                                            </View>
                                        </View>
                                        <View style={{ position: 'absolute', top: MODERN_NAME_TOP, left: 0, right: 0, display: 'flex', alignItems: 'center', zIndex: 4 }}>
                                            <View style={{ position: 'absolute', top: 2, backgroundColor: 'rgba(15, 23, 42, 0.10)', borderRadius: 13.5, ...modernNameStyle }} />
                                            <View style={{ backgroundColor: '#ffffff', border: `1.5px solid ${SAMPLE_MODERN_BLUE_LIGHT}`, borderRadius: 13.5, ...modernNameStyle }}>
                                                <Text style={{ fontSize: modernNameStyle.fontSize, fontFamily: 'Helvetica-Bold', color: SAMPLE_MODERN_NAME, textAlign: 'center' }}>{student.name}</Text>
                                            </View>
                                        </View>
                                    </View>
                                </>
                            ) : (
                                <>
                                    <View style={styles.cardBackgroundSvg}>
                                        <Svg viewBox="0 0 243 153" style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }} preserveAspectRatio="none">
                                            <Path d="M -5 -5 L 248 -5 L 248 44 Q 120 72 -5 38 Z" fill={activeColors.topCurve} />
                                            <Path d="M -5 -5 L 248 -5 L 248 43 Q 120 62 -5 33 Z" fill={activeColors.mainCurve} />
                                        </Svg>
                                    </View>
                                    <View style={[styles.bottomBorder, { backgroundColor: activeColors.bottomBorder }]} />
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
                                                    <View style={[styles.idPill, { backgroundColor: activeColors.idPill }]}>
                                                        <Text>IDENTITY CARD</Text>
                                                    </View>
                                                </View>

                                                <View style={styles.infoGrid}>
                                                    <View style={styles.infoRow}>
                                                        <Text style={styles.infoLabel}>Name</Text>
                                                        <Text style={styles.infoSeparator}>:</Text>
                                                        <Text style={[styles.infoValueHighlight, { color: activeColors.nameHighlight }]}>{student.name}</Text>
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
                                </>
                            )}
                        </View>
                    );
                })}
            </Page>
        </Document>
    );
};

export default StudentCardsPDFDocument;
