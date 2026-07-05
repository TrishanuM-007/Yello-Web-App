import React, { useState, useRef, useEffect } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { Menu, UploadCloud, FileText, Image as ImageIcon, Download, Loader2 } from 'lucide-react';
import { Platform, View, Text } from 'react-native';
import * as PDFLib from 'pdf-lib/dist/pdf-lib.min.js';
const { PDFDocument, rgb, StandardFonts } = PDFLib;

export default function UploadTestReportScreen() {
  const { isDarkMode } = useTheme();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const [logoFile, setLogoFile] = useState(null);
  const [logoUri, setLogoUri] = useState(null);
  const [pdfFile, setPdfFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const logoInputRef = useRef(null);
  const pdfInputRef = useRef(null);

  useEffect(() => {
    if (Platform.OS === 'web' && !document.getElementById('tailwind-cdn')) {
      const script = document.createElement('script');
      script.id = 'tailwind-cdn';
      script.src = 'https://cdn.tailwindcss.com';
      document.head.appendChild(script);
    }
  }, []);

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

      const pdfDoc = await PDFDocument.load(pdfArrayBuffer);

      let embeddedLogo;
      if (logoFile.type === 'image/jpeg' || logoFile.type === 'image/jpg') {
        embeddedLogo = await pdfDoc.embedJpg(logoArrayBuffer);
      } else {
        embeddedLogo = await pdfDoc.embedPng(logoArrayBuffer);
      }

      const logoDims = embeddedLogo.scale(0.25);

      const pages = pdfDoc.getPages();
      const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

      for (const page of pages) {
        const { width, height } = page.getSize();

        const logoX = width - logoDims.width - 30;
        const rightMargin = logoX - 70;
        const textColor = rgb(0.35, 0.25, 0.15); // Dark brownish color

        const text1 = 'Address:';
        const text2 = 'GV Pride, 3rd Floor Gandipet Main Rd, Kokapet 500075, Telangana, India';
        const text3 = 'www.yellomedi.com | yellomedi@gmail.com | @yello.medi';

        const size1 = 11;
        const size2 = 9;
        const size3 = 9;

        const width1 = fontBold.widthOfTextAtSize(text1, size1);
        const width2 = fontRegular.widthOfTextAtSize(text2, size2);
        const width3 = fontBold.widthOfTextAtSize(text3, size3);

        page.drawText(text1, {
          x: rightMargin - width1,
          y: height - 40,
          size: size1,
          font: fontBold,
          color: textColor
        });

        page.drawText(text2, {
          x: rightMargin - width2,
          y: height - 58,
          size: size2,
          font: fontRegular,
          color: textColor
        });

        page.drawText(text3, {
          x: rightMargin - width3,
          y: height - 74,
          size: size3,
          font: fontBold,
          color: textColor
        });

        // Logo Image
        page.drawImage(embeddedLogo, {
          x: logoX,
          y: height - logoDims.height - 20,
          width: logoDims.width,
          height: logoDims.height
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

  if (Platform.OS !== 'web') {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>This component is optimized for Web only.</Text>
      </View>
    );
  }

  return (
    <div className={`flex h-screen w-full bg-gray-50 dark:bg-[#0F172A] text-gray-900 dark:text-white ${isDarkMode ? 'dark' : ''}  overflow-hidden font-sans`}>



      {/* Main Content */}
      <main className="flex-1 overflow-y-auto relative p-4 md:p-8 flex flex-col min-w-0 items-center">

        <div className="w-full max-w-3xl flex flex-col w-full mt-4">
          {/* Header Row */}
          <header className="flex flex-col gap-2 mb-8 shrink-0 border-b border-gray-200 dark:border-gray-800 pb-6 text-center">
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-gray-900 dark:text-white">Brand PDF Reports</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">Upload a raw lab report to inject your clinic's branding and headers automatically.</p>
          </header>

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

          <div className="w-full bg-white dark:bg-[#1E293B] border border-gray-200 dark:border-gray-800 rounded-3xl p-8 md:p-10 flex flex-col gap-8 shadow-xl">

            {/* Step 1: Logo */}
            <div className="flex flex-col gap-4">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-yellow-400/20 text-yellow-400 flex items-center justify-center text-xs">1</span>
                Select Clinic Logo
              </h2>
              <button
                onClick={() => logoInputRef.current?.click()}
                className="w-full border-2 border-dashed border-gray-600 hover:border-yellow-400 bg-gray-50 dark:bg-[#0F172A] rounded-2xl p-8 flex flex-col items-center justify-center text-gray-500 dark:text-gray-400 hover:text-yellow-400 transition-colors gap-3"
              >
                {logoUri ? (
                  <img src={logoUri} alt="Logo preview" className="h-16 object-contain" />
                ) : (
                  <>
                    <ImageIcon size={32} />
                    <span className="font-medium">Click to upload logo (PNG/JPG)</span>
                  </>
                )}
              </button>
            </div>

            {/* Step 2: PDF */}
            <div className="flex flex-col gap-4">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-yellow-400/20 text-yellow-400 flex items-center justify-center text-xs">2</span>
                Select Raw PDF
              </h2>
              <button
                onClick={() => pdfInputRef.current?.click()}
                className={`w-full border-2 rounded-2xl p-6 flex items-center justify-center transition-colors gap-3 font-bold ${pdfFile ? 'border-green-500 bg-green-500/10 text-green-400' : 'border-gray-600 border-dashed bg-gray-50 dark:bg-[#0F172A] text-gray-500 dark:text-gray-400 hover:border-yellow-400 hover:text-yellow-400'
                  }`}
              >
                <FileText size={24} />
                {pdfFile ? pdfFile.name : 'Select PDF Report'}
              </button>
            </div>

            {/* Step 3: Action */}
            <div className="flex flex-col gap-4 pt-4 border-t border-gray-200 dark:border-gray-800">
              <button
                onClick={applyBrandingAndDownload}
                disabled={isProcessing}
                className={`w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-3 transition-all ${isProcessing
                  ? 'bg-gray-200 dark:bg-gray-800 text-gray-500 cursor-not-allowed'
                  : 'bg-yellow-400 hover:bg-yellow-500 text-yellow-950 shadow-[0_4px_15px_rgb(250,204,21,0.2)] hover:shadow-[0_6px_20px_rgb(250,204,21,0.3)] hover:-translate-y-0.5'
                  }`}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="animate-spin" size={20} />
                    Processing PDF...
                  </>
                ) : (
                  <>
                    <Download size={20} />
                    Format & Download Branded PDF
                  </>
                )}
              </button>
            </div>

          </div>

        </div>
      </main>


    </div>
  );
}
