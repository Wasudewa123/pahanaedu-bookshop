let wasu = document.querySelector('.wasu')
let pasan1 = document.querySelector('.pasan1')

pasan1.addEventListener('click',function(){
    let items = document.querySelectorAll('.item')
    document.querySelector('.slide').appendChild(items[0])
})

wasu.addEventListener('click',function(){
    let items = document.querySelectorAll('.item')
    document.querySelector('.slide').prepend(items[items.length - 2])
})

// About Modern Slider Logic
(function() {
  const slides = Array.from(document.querySelectorAll('.about-slide'));
  const leftBtn = document.getElementById('aboutArrowLeft');
  const rightBtn = document.getElementById('aboutArrowRight');
  let current = 0;
  let timer = null;

  function showSlide(idx) {
    slides.forEach((slide, i) => {
      slide.classList.toggle('active', i === idx);
    });
    current = idx;
  }

  function nextSlide() {
    showSlide((current + 1) % slides.length);
  }

  function prevSlide() {
    showSlide((current - 1 + slides.length) % slides.length);
  }

  if (leftBtn && rightBtn && slides.length > 0) {
    leftBtn.addEventListener('click', () => {
      prevSlide();
      resetTimer();
    });
    rightBtn.addEventListener('click', () => {
      nextSlide();
      resetTimer();
    });
    function resetTimer() {
      if (timer) clearInterval(timer);
      timer = setInterval(nextSlide, 5000);
    }
    timer = setInterval(nextSlide, 5000);
    showSlide(0);
  }
})();

