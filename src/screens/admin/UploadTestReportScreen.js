import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Image, ScrollView, Platform } from 'react-native';
import * as PDFLib from 'pdf-lib/dist/pdf-lib.min.js';
const { PDFDocument, rgb } = PDFLib;
import { useTheme } from '../../context/ThemeContext';
import ClayButton from '../../components/ClayButton';
import ClayCard from '../../components/ClayCard';

export default function UploadTestReportScreen() {
  const { theme, isDarkMode } = useTheme();
  const styles = getStyles(theme, isDarkMode);

  const [logoFile, setLogoFile] = useState(null);
  const [logoUri, setLogoUri] = useState(null);
  const [pdfFile, setPdfFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const logoInputRef = useRef(null);
  const pdfInputRef = useRef(null);

  const handleLogoSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setLogoFile(file);
      setLogoUri(URL.createObjectURL(file));
    }
  };

  const handlePdfSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPdfFile(file);
    }
  };

  const applyBrandingAndDownload = async () => {
    if (!logoFile) {
      window.alert('Missing Logo: Please select a clinic logo first.');
      return;
    }
    if (!pdfFile) {
      window.alert('Missing PDF: Please select a PDF report to format.');
      return;
    }

    setIsProcessing(true);
    try {
      const pdfArrayBuffer = await pdfFile.arrayBuffer();
      const logoArrayBuffer = await logoFile.arrayBuffer();

      const pdfDoc = await PDFLib.PDFDocument.load(pdfArrayBuffer);

      let embeddedLogo;
      if (logoFile.type === 'image/jpeg' || logoFile.type === 'image/jpg') {
        embeddedLogo = await pdfDoc.embedJpg(logoArrayBuffer);
      } else {
        embeddedLogo = await pdfDoc.embedPng(logoArrayBuffer);
      }

      const logoDims = embeddedLogo.scale(0.25);

      const pages = pdfDoc.getPages();
      for (const page of pages) {
        const { width, height } = page.getSize();

        // Element 1 (Address)
        page.drawText('Address: GV Pride, 3rd Floor Gandipet Main Rd, Kokapet 500075, Telangana, India', {
          x: 50,
          y: height - 40,
          size: 10,
          color: PDFLib.rgb(0.3, 0.3, 0.3)
        });

        // Element 2 (Contact)
        page.drawText('www.yelloclinics.com | info@yelloclinics.com | @yello.medi', {
          x: 50,
          y: height - 55,
          size: 10,
          color: PDFLib.rgb(0.3, 0.3, 0.3)
        });

        // Element 3 (Logo Image)
        page.drawImage(embeddedLogo, {
          x: width - logoDims.width - 40,
          y: height - logoDims.height - 30,
          width: logoDims.width,
          height: logoDims.height
        });

        // Element 4 (Sub-branding Text)
        page.drawText('Clinics Diagnostics', {
          x: width - 150,
          y: height - logoDims.height - 45,
          size: 12,
          color: PDFLib.rgb(0.3, 0.3, 0.3)
        });
      }

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });

      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = 'YelloMedi_Report_Branded.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      window.alert('Success: Report formatted and downloaded successfully!');

    } catch (error) {
      console.error('Error formatting PDF:', error);
      window.alert('Error: An error occurred while formatting the PDF.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <Text style={styles.title}>Format Report</Text>

      {/* Hidden Web Inputs */}
      {Platform.OS === 'web' && (
        <>
          <input
            type="file"
            accept="image/png, image/jpeg"
            ref={logoInputRef}
            style={{ display: 'none' }}
            onChange={handleLogoSelect}
          />
          <input
            type="file"
            accept="application/pdf"
            ref={pdfInputRef}
            style={{ display: 'none' }}
            onChange={handlePdfSelect}
          />
        </>
      )}

      <ClayCard style={styles.card}>
        <Text style={styles.label}>1. Select Clinic Logo</Text>
        <ClayButton
          title="Pick Logo Image"
          onPress={() => logoInputRef.current?.click()}
          variant="secondary"
          style={styles.button}
        />

        {logoUri && (
          <View style={styles.previewContainer}>
            <Image
              source={{ uri: logoUri }}
              style={{ width: 100, height: 100, resizeMode: 'contain' }}
            />
          </View>
        )}

        <Text style={[styles.label, { marginTop: theme.spacing.xl }]}>2. Select PDF Report</Text>
        <ClayButton
          title={pdfFile ? `Selected: ${pdfFile.name}` : "Pick Raw PDF"}
          onPress={() => pdfInputRef.current?.click()}
          variant="secondary"
          style={styles.button}
        />

        <Text style={[styles.label, { marginTop: theme.spacing.xl }]}>3. Apply Branding</Text>
        <ClayButton
          title="Format & Download PDF"
          onPress={applyBrandingAndDownload}
          style={styles.button}
          disabled={isProcessing}
        />

        {isProcessing && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={styles.loadingText}>Processing PDF...</Text>
          </View>
        )}
      </ClayCard>
    </ScrollView>
  );
}

const getStyles = (theme, isDarkMode) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    padding: theme.spacing.xl,
    paddingTop: 40,
  },
  title: {
    ...theme.typography.header,
    color: isDarkMode ? '#FFFFFF' : theme.colors.text,
    marginBottom: theme.spacing.xl,
  },
  card: {
    width: '100%',
    padding: theme.spacing.lg,
  },
  label: {
    ...theme.typography.title,
    fontSize: 16,
    color: isDarkMode ? '#FFFFFF' : theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  button: {
    marginBottom: theme.spacing.md,
  },
  previewContainer: {
    alignItems: 'center',
    marginVertical: theme.spacing.md,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.surface,
  },
  loadingContainer: {
    marginTop: theme.spacing.lg,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: theme.spacing.sm,
    color: isDarkMode ? '#FFFFFF' : theme.colors.text,
    ...theme.typography.body,
  }
});
