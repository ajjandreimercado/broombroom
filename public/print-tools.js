// Download PDF / Print buttons on receipt and quotation pages. A file (not inline code) so the site's
// Content-Security-Policy can forbid inline scripts. html2pdf is loaded just before this file.
(function () {
  var file = document.currentScript.getAttribute('data-file') || 'document.pdf';
  window.bbPdf = function () {
    return html2pdf()
      .set({ margin: 10, filename: file, image: { type: 'jpeg', quality: 0.95 }, html2canvas: { scale: 2, useCORS: true }, jsPDF: { unit: 'mm', format: 'letter' } })
      .from(document.querySelector('.sheet'))
      .save();
  };
  document.getElementById('bb-pdf').addEventListener('click', function () { window.bbPdf(); });
  document.getElementById('bb-print').addEventListener('click', function () { window.print(); });
})();
