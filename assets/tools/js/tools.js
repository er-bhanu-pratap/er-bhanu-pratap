/**
 * Just Fun Page - Interactive Tools
 * Simple mobile nav and card interactions
 */

document.addEventListener('DOMContentLoaded', () => {
  // Mobile menu toggle
  const menuToggle = document.getElementById('menuToggle');
  const mobileNav = document.getElementById('mobileNav');
  const closeNav = document.getElementById('closeNav');
  
  if (menuToggle && mobileNav) {
    menuToggle.addEventListener('click', () => {
      mobileNav.classList.add('active');
    });
    
    closeNav.addEventListener('click', () => {
      mobileNav.classList.remove('active');
    });
    
    // Close on link click
    mobileNav.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        mobileNav.classList.remove('active');
      });
    });
  }
  
  // Card entrance animation
  const cards = document.querySelectorAll('.tool-card');
  cards.forEach((card, index) => {
    card.style.opacity = '0';
    card.style.transform = 'translateY(20px)';
    
    setTimeout(() => {
      card.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
      card.style.opacity = '1';
      card.style.transform = 'translateY(0)';
    }, index * 100);
  });
  
  // Add click ripple effect to cards
  cards.forEach(card => {
    card.addEventListener('click', function(e) {
      const rect = this.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      const ripple = document.createElement('span');
      ripple.style.cssText = `
        position: absolute;
        width: 20px;
        height: 20px;
        background: rgba(108, 99, 255, 0.3);
        border-radius: 50%;
        transform: translate(-50%, -50%) scale(0);
        animation: ripple 0.6s ease-out;
        pointer-events: none;
        left: ${x}px;
        top: ${y}px;
      `;
      
      this.appendChild(ripple);
      
      setTimeout(() => ripple.remove(), 600);
    });
  });
});

// Ripple animation keyframes (injected)
const style = document.createElement('style');
style.textContent = `
  @keyframes ripple {
    to {
      transform: translate(-50%, -50%) scale(15);
      opacity: 0;
    }
  }
`;
document.head.appendChild(style);
