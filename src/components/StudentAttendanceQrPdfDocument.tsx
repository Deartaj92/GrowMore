import React from 'react';
import { Document, Page, Text, View, Image, StyleSheet } from '@react-pdf/renderer';

/** One label on the sheet — sorted by class then name before passing in */
export type StudentQrPdfItem = {
    id: number;
    /** Single line: "Student / Father (Class — Section)" */
    captionLine: string;
    qrDataUrl: string;
};

const COLS = 5;
const ROWS = 6;
const ITEMS_PER_PAGE = COLS * ROWS;

const PAGE_MARGIN = 12;
const HEADER_GAP = 6;
const CELL_PAD = 2;
/** Largest QR that fits the 5×6 grid on A4 while staying scannable */
const QR_PT = 86;
const CAPTION_FS = 5;

const styles = StyleSheet.create({
    page: {
        padding: PAGE_MARGIN,
        fontFamily: 'Helvetica',
    },
    header: {
        marginBottom: HEADER_GAP,
        borderBottomWidth: 0.5,
        borderBottomColor: '#999999',
        borderBottomStyle: 'solid',
        paddingBottom: 4,
    },
    title: { fontSize: 10, fontWeight: 'bold', color: '#111111' },
    subtitle: { fontSize: 7, color: '#555555', marginTop: 2 },
    grid: {
        width: '100%',
    },
    gridRow: {
        flexDirection: 'row',
        width: '100%',
        alignItems: 'stretch',
    },
    cell: {
        width: '20%',
        padding: CELL_PAD,
        alignItems: 'center',
        justifyContent: 'flex-start',
        borderWidth: 0.5,
        borderColor: '#cccccc',
        borderStyle: 'solid',
        minHeight: QR_PT + CAPTION_FS * 3 + 10,
    },
    cellEmpty: {
        width: '20%',
        padding: CELL_PAD,
        borderWidth: 0.5,
        borderColor: '#eeeeee',
        borderStyle: 'solid',
        minHeight: QR_PT + CAPTION_FS * 3 + 10,
    },
    caption: {
        fontSize: CAPTION_FS,
        color: '#222222',
        textAlign: 'center',
        width: '100%',
        marginTop: 3,
    },
    qr: {
        width: QR_PT,
        height: QR_PT,
    },
});

type Props = {
    schoolName: string;
    items: StudentQrPdfItem[];
};

const chunk = <T,>(arr: T[], size: number): T[][] => {
    const out: T[][] = [];
    for (let i = 0; i < arr.length; i += size) {
        out.push(arr.slice(i, i + size));
    }
    return out;
};

const padRow = <T,>(row: T[], len: number): (T | null)[] => {
    const copy = row.slice();
    while (copy.length < len) copy.push(null as unknown as T);
    return copy;
};

const StudentAttendanceQrPdfDocument: React.FC<Props> = ({ schoolName, items }) => {
    const pages = chunk(items, ITEMS_PER_PAGE);

    return (
        <Document>
            {pages.map((pageItems, pi) => {
                const rows: (StudentQrPdfItem | null)[][] = [];
                for (let r = 0; r < ROWS; r++) {
                    const slice = pageItems.slice(r * COLS, r * COLS + COLS);
                    rows.push(padRow(slice, COLS));
                }

                return (
                    <Page key={pi} size="A4" style={styles.page}>
                        <View style={styles.header} wrap={false}>
                            <Text style={styles.title}>{schoolName}</Text>
                            <Text style={styles.subtitle}>
                                Student QR labels (by class) — page {pi + 1} of {pages.length}
                            </Text>
                        </View>
                        <View style={styles.grid}>
                            {rows.map((row, ri) => (
                                <View key={ri} style={styles.gridRow} wrap={false}>
                                    {row.map((item, ci) =>
                                        item ? (
                                            <View key={item.id} style={styles.cell}>
                                                <Image src={item.qrDataUrl} style={styles.qr} />
                                                <Text style={styles.caption}>{item.captionLine}</Text>
                                            </View>
                                        ) : (
                                            <View key={`empty-${ri}-${ci}`} style={styles.cellEmpty} />
                                        )
                                    )}
                                </View>
                            ))}
                        </View>
                    </Page>
                );
            })}
        </Document>
    );
};

export default StudentAttendanceQrPdfDocument;
