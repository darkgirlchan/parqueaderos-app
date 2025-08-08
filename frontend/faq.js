document.addEventListener('DOMContentLoaded', () => {
    const faqItems = document.querySelectorAll('.faq-item');

    faqItems.forEach(item => {
        item.addEventListener('click', () => {
            // Alterna la clase 'active' en el elemento clicado
            item.classList.toggle('active');
        });
    });
});