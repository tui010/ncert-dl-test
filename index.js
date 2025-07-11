const dlBtn = document.getElementById("download");
const statusView = document.getElementById("status");
const bookCodeInput = document.getElementById("book-code-input");
const bookCoverImage = document.getElementById("cover-img");

const setStatus = (text) => statusView.innerText = text;

// https://www.geeksforgeeks.org/javascript/how-to-retrieve-get-parameters-from-javascript/
// Arrow function to get the parameter
// of the specified key
const getParameter = (key) => {

    // Address of the current window
    address = window.location.search

    // Returns a URLSearchParams object instance
    parameterList = new URLSearchParams(address)

    // Returning the respected value associated
    // with the provided key
    return parameterList.get(key)
}

function downloadFile(url, filename) {
    const a = document.createElement('a');
    a.href = url;
    // a.target = "_blank";
    a.download = filename;
    a.click();
}

function openFileNewTab(url) {
    let tab = window.open();
    tab.location.href = url;
}

const loadBookCover = (bookCode) => bookCoverImage.src = "https://ncert.nic.in/textbook/pdf/" + bookCode + "cc.jpg";

// const getProxyUrl = (url) => "https://downloads.views4you.com/?url=" + btoa(url);
function getProxyUrl(url) {
    return 'https://api.cors.lol/?url=' + encodeURIComponent(url);
}

async function fetchZip(zipUrl) {
    const response = await fetch(zipUrl);
    const zipBlob = await response.blob();
    const zip = await JSZip.loadAsync(zipBlob);
    return zip;
}

async function convertToPdf(zip, bookCode) {
    const TEMP_FOLDER = {}; // Simulate file system with an object

    const extractedFiles = [];
    for (const [filename, fileObj] of Object.entries(zip.files)) {
        if (!fileObj.dir && filename.endsWith('.pdf')) {
            const fileData = await fileObj.async('uint8array');
            TEMP_FOLDER[filename] = fileData;
            extractedFiles.push(filename);
        }
    }

    extractedFiles.sort();

    // Step 4: Move "ps.pdf" to the front if it exists
    const psFile = bookCode + 'ps.pdf';
    const idx = extractedFiles.indexOf(psFile);
    if (idx !== -1) {
        extractedFiles.unshift(extractedFiles.splice(idx, 1)[0]);
    }

    const { PDFDocument } = PDFLib;
    const mergedPdf = await PDFDocument.create();

    for (const filename of extractedFiles) {
        const pdfBytes = TEMP_FOLDER[filename];
        const pdf = await PDFDocument.load(pdfBytes);
        const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
        copiedPages.forEach((page) => mergedPdf.addPage(page));
    }

    const mergedPdfBytes = await mergedPdf.save();

    return mergedPdfBytes;
}

async function downloadBook(bookCode) {
    setStatus("Creating proxy url...");
    const zipUrl = 'https://ncert.nic.in/textbook/pdf/' + bookCode + 'dd.zip';
    const proxyUrl = getProxyUrl(zipUrl);
    setStatus("Fetching file from NCERT...");
    const zip = await fetchZip(proxyUrl);
    setStatus("Converting to PDF...");
    const pdfBytes = await convertToPdf(zip, bookCode);
    setStatus("Creating URL...");
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);

    setStatus("Starting Download...");
    downloadFile(url, bookCode + '.pdf');
    URL.revokeObjectURL(url);
}

// fetchAndMergeZip('http://localhost:8000/kemh1dd.zip', 'kemh1');
// fetchAndMergeZip('https://ncert.nic.in/textbook/pdf/kemh1dd.zip', 'kemh1');

window.onload = async () => {
    const bookCode = getParameter("book_code");
    if (bookCode == null) {
        return;
    }
    loadBookCover(bookCode);
    await downloadBook(bookCode);
    setStatus("Started download!");
};

dlBtn.addEventListener('click', async () => {
    const bookCode = bookCodeInput.value;
    window.location.href = "index.html?book_code=" + bookCode;
    // loadBookCover(bookCode);
    // await downloadBook(bookCode);
    // setStatus("Started download!");
});
