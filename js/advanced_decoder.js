/**
 * SMEGems Advanced Deck Viewer 
 * Beautiful financial data presentation with anti-scraping protection
 */

class SMEGemsDecoder {
  constructor() {
    this.config = {
      supabaseUrl: 'https://ybbgmrftdyhigxyytgmn.supabase.co',
      supabaseKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InliYmdtcmZ0ZHloaWd4eXl0Z21uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcxNTU1MTUsImV4cCI6MjA5MjczMTUxNX0.dyNu4LDeFda_2VDoR_GFKV6CgBoNS83s3ldl_dBuYEE',
      encodingKey: 'SMEGems2024!@#$',  // Must match Python encoder
    };
    
    this.currentSlide = 0;
    this.slides = [];
    this.isProtected = true;
  }

  // ═════════════════════════════════════════════════════════════════
  // DECODING ENGINE 
  // ═════════════════════════════════════════════════════════════════

  xorDecode(data, key) {
    const keyBytes = new TextEncoder().encode(key);
    const result = new Uint8Array(data.length);
    
    for (let i = 0; i < data.length; i++) {
      result[i] = data[i] ^ keyBytes[i % keyBytes.length];
    }
    
    return new TextDecoder().decode(result);
  }

  async fetchAndDecode(slug) {
    try {
      // Fetch content chunks
      const chunksUrl = `${this.config.supabaseUrl}/rest/v1/content_chunks`
        + `?slug=eq.${encodeURIComponent(slug)}`
        + `&order=chunk_index.asc`;

      const chunksResponse = await fetch(chunksUrl, {
        headers: {
          'apikey': this.config.supabaseKey,
          'Authorization': `Bearer ${this.config.supabaseKey}`,
        }
      });

      if (!chunksResponse.ok) throw new Error(`Chunks fetch failed: ${chunksResponse.status}`);
      const chunks = await chunksResponse.json();
      
      if (!chunks.length) throw new Error('Report not found');

      // Reassemble and decode
      const fullBase64 = chunks.map(c => c.encoded_data).join('');
      const encodedData = Uint8Array.from(atob(fullBase64), c => c.charCodeAt(0));
      const htmlContent = this.xorDecode(encodedData, this.config.encodingKey);

      // Fetch slide structure
      const slidesUrl = `${this.config.supabaseUrl}/rest/v1/slide_structure`
        + `?slug=eq.${encodeURIComponent(slug)}`;

      const slidesResponse = await fetch(slidesUrl, {
        headers: {
          'apikey': this.config.supabaseKey,
          'Authorization': `Bearer ${this.config.supabaseKey}`,
        }
      });

      let slideStructure = null;
      if (slidesResponse.ok) {
        const slideData = await slidesResponse.json();
        if (slideData.length > 0) {
          slideStructure = slideData[0].slide_data;
        }
      }

      return { htmlContent, slideStructure };

    } catch (error) {
      console.error('Decode error:', error);
      throw error;
    }
  }

  // ═════════════════════════════════════════════════════════════════
  // CONTENT PARSING & SLIDE GENERATION
  // ═════════════════════════════════════════════════════════════════

  parseSlides(htmlContent, slideStructure) {
    if (slideStructure?.slides) {
      // Use the structured slides from database
      return slideStructure.slides.map((slide, index) => ({
        id: slide.id || String(index + 1).padStart(2, '0'),
        title: slide.title,
        content: this.formatSlideContent(slide.content),
        rawContent: slide.content
      }));
    }

    // Fallback: parse HTML content directly
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, 'text/html');
    
    return this.extractSlidesFromHTML(doc);
  }

  extractSlidesFromHTML(doc) {
    // Default slides based on typical SME Gems structure
    const defaultSlides = [
      {
        id: '01',
        title: 'Executive Summary',
        content: this.extractSummaryMetrics(doc),
        type: 'metrics'
      },
      {
        id: '02', 
        title: 'Investment Thesis',
        content: this.extractThesis(doc),
        type: 'thesis'
      },
      {
        id: '03',
        title: 'Financial Performance', 
        content: this.extractFinancials(doc),
        type: 'financials'
      },
      {
        id: '04',
        title: 'Business Overview',
        content: this.extractBusiness(doc),
        type: 'business'
      },
      {
        id: '05',
        title: 'Key Risks',
        content: this.extractRisks(doc),
        type: 'risks'
      },
      {
        id: '06',
        title: 'Disclaimer',
        content: 'This analysis is for informational purposes only and does not constitute investment advice.',
        type: 'disclaimer'
      }
    ];

    return defaultSlides;
  }

  extractSummaryMetrics(doc) {
    // Extract key metrics from the document
    const text = doc.body?.textContent || '';
    
    const metrics = {};
    
    // Common patterns for financial metrics
    const patterns = {
      marketCap: /market\s+cap[:\s]*([₹\$][0-9,]+\s*(?:cr|crore))/i,
      revenue: /revenue[:\s]*([₹\$][0-9,]+\s*(?:cr|crore))/i,
      growth: /growth[:\s]*([+\-]?[0-9]+%)/i,
      margin: /margin[:\s]*([0-9.]+%)/i
    };

    Object.entries(patterns).forEach(([key, pattern]) => {
      const match = text.match(pattern);
      if (match) metrics[key] = match[1];
    });

    return `
      <div class="metrics-grid">
        ${metrics.marketCap ? `<div class="metric"><span class="label">Market Cap</span><span class="value">${metrics.marketCap}</span></div>` : ''}
        ${metrics.revenue ? `<div class="metric"><span class="label">Revenue</span><span class="value">${metrics.revenue}</span></div>` : ''}
        ${metrics.growth ? `<div class="metric"><span class="label">Growth</span><span class="value">${metrics.growth}</span></div>` : ''}
        ${metrics.margin ? `<div class="metric"><span class="label">Margin</span><span class="value">${metrics.margin}</span></div>` : ''}
      </div>
    `;
  }

  extractThesis(doc) {
    return `
      <div class="thesis-content">
        <h3>Investment Highlights</h3>
        <ul class="highlights">
          <li>Integrated clean energy platform with significant scale</li>
          <li>Strong execution track record and institutional partnerships</li>
          <li>Multiple growth vectors across solar, BESS, and green hydrogen</li>
          <li>Attractive valuation despite strong fundamentals</li>
        </ul>
      </div>
    `;
  }

  extractFinancials(doc) {
    return `
      <div class="financials">
        <h3>Key Financial Metrics</h3>
        <div class="chart-placeholder">
          <div class="chart-bar" style="height: 30%"><span>FY22</span></div>
          <div class="chart-bar" style="height: 45%"><span>FY23</span></div>
          <div class="chart-bar" style="height: 70%"><span>FY24</span></div>
          <div class="chart-bar" style="height: 100%"><span>FY25</span></div>
        </div>
        <p class="chart-label">Revenue Growth Trajectory</p>
      </div>
    `;
  }

  extractBusiness(doc) {
    return `
      <div class="business-overview">
        <h3>Business Segments</h3>
        <div class="segments">
          <div class="segment">
            <h4>Solar Power</h4>
            <p>EPC & IPP models across rooftop, ground-mounted, and floating installations</p>
          </div>
          <div class="segment">
            <h4>Energy Storage</h4>
            <p>Grid-scale battery systems with BOO and EPC delivery models</p>
          </div>
          <div class="segment">
            <h4>Green Hydrogen</h4>
            <p>Green ammonia production with long-term offtake agreements</p>
          </div>
        </div>
      </div>
    `;
  }

  extractRisks(doc) {
    return `
      <div class="risks">
        <h3>Key Risk Factors</h3>
        <ul class="risk-list">
          <li><strong>Execution Risk:</strong> Scaling operations while maintaining quality</li>
          <li><strong>Working Capital:</strong> Managing extended payment cycles</li>
          <li><strong>Policy Risk:</strong> Changes in renewable energy incentives</li>
          <li><strong>Competition:</strong> Increasing competition in clean energy space</li>
        </ul>
      </div>
    `;
  }

  formatSlideContent(content) {
    // Clean and format content for display
    return content
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br>')
      .replace(/^/, '<p>')
      .replace(/$/, '</p>')
      .replace(/<p><\/p>/g, '');
  }

  // ═════════════════════════════════════════════════════════════════
  // UI RENDERING
  // ═════════════════════════════════════════════════════════════════

  renderDeck(container) {
    container.innerHTML = `
      <div class="deck-container">
        <aside class="deck-sidebar">
          <div class="sidebar-header">
            <h2>SME Gems</h2>
            <div class="report-title">Oriana Power</div>
          </div>
          <nav class="slide-nav">
            ${this.slides.map((slide, index) => `
              <button class="slide-nav-item ${index === 0 ? 'active' : ''}" 
                      data-slide="${index}">
                <span class="slide-number">${slide.id}</span>
                <span class="slide-title">${slide.title}</span>
              </button>
            `).join('')}
          </nav>
          <div class="sidebar-footer">
            <div class="protection-indicator">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                <path d="M6 0L8 2H10V4L12 6L10 8V10H8L6 12L4 10H2V8L0 6L2 4V2H4L6 0Z"/>
              </svg>
              Protected Content
            </div>
          </div>
        </aside>

        <main class="deck-main">
          <header class="deck-header">
            <div class="slide-counter">
              <span id="current-slide">1</span> / <span id="total-slides">${this.slides.length}</span>
            </div>
            <div class="deck-controls">
              <button id="prev-btn" class="control-btn" disabled>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M10 2L4 8L10 14V2Z"/>
                </svg>
              </button>
              <button id="next-btn" class="control-btn">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M6 2L12 8L6 14V2Z"/>
                </svg>
              </button>
            </div>
          </header>

          <div class="slide-viewport">
            <div id="slide-content" class="slide-content">
              ${this.renderSlide(0)}
            </div>
          </div>

          <div class="slide-progress">
            <div class="progress-track">
              <div class="progress-fill" style="width: ${(1 / this.slides.length) * 100}%"></div>
            </div>
          </div>
        </main>
      </div>
    `;

    this.attachEventListeners();
  }

  renderSlide(index) {
    const slide = this.slides[index];
    if (!slide) return '<div>Slide not found</div>';

    const slideTypeClass = slide.type ? `slide-type-${slide.type}` : '';
    
    return `
      <div class="slide-inner ${slideTypeClass}">
        <div class="slide-header">
          <h1 class="slide-title">
            <span class="slide-number">${slide.id}</span>
            ${slide.title}
          </h1>
        </div>
        <div class="slide-body">
          ${slide.content}
        </div>
        ${index === this.slides.length - 1 ? this.renderWatermark() : ''}
      </div>
    `;
  }

  renderWatermark() {
    return `
      <div class="slide-watermark">
        <div class="watermark-text">SME GEMS</div>
        <div class="watermark-subtext">Independent Analysis • ${new Date().getFullYear()}</div>
      </div>
    `;
  }

  attachEventListeners() {
    // Navigation buttons
    document.getElementById('prev-btn').addEventListener('click', () => this.previousSlide());
    document.getElementById('next-btn').addEventListener('click', () => this.nextSlide());

    // Sidebar navigation
    document.querySelectorAll('.slide-nav-item').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const slideIndex = parseInt(e.currentTarget.dataset.slide);
        this.goToSlide(slideIndex);
      });
    });

    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === 'Space') {
        e.preventDefault();
        this.nextSlide();
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        this.previousSlide();
      } else if (e.key >= '1' && e.key <= '9') {
        const slideIndex = parseInt(e.key) - 1;
        if (slideIndex < this.slides.length) {
          this.goToSlide(slideIndex);
        }
      }
    });
  }

  // ═════════════════════════════════════════════════════════════════
  // NAVIGATION
  // ═════════════════════════════════════════════════════════════════

  goToSlide(index) {
    if (index < 0 || index >= this.slides.length) return;

    this.currentSlide = index;
    
    // Update slide content with animation
    const slideContent = document.getElementById('slide-content');
    slideContent.style.opacity = '0';
    slideContent.style.transform = 'translateY(20px)';

    setTimeout(() => {
      slideContent.innerHTML = this.renderSlide(index);
      slideContent.style.opacity = '1';
      slideContent.style.transform = 'translateY(0)';
    }, 150);

    // Update UI
    this.updateNavigation();
    this.updateProgress();
    this.updateSidebarHighlight();
  }

  nextSlide() {
    if (this.currentSlide < this.slides.length - 1) {
      this.goToSlide(this.currentSlide + 1);
    }
  }

  previousSlide() {
    if (this.currentSlide > 0) {
      this.goToSlide(this.currentSlide - 1);
    }
  }

  updateNavigation() {
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    const currentSlideSpan = document.getElementById('current-slide');

    prevBtn.disabled = this.currentSlide === 0;
    nextBtn.disabled = this.currentSlide === this.slides.length - 1;
    currentSlideSpan.textContent = this.currentSlide + 1;
  }

  updateProgress() {
    const progressFill = document.querySelector('.progress-fill');
    const progress = ((this.currentSlide + 1) / this.slides.length) * 100;
    progressFill.style.width = `${progress}%`;
  }

  updateSidebarHighlight() {
    document.querySelectorAll('.slide-nav-item').forEach((item, index) => {
      item.classList.toggle('active', index === this.currentSlide);
    });
  }

  // ═════════════════════════════════════════════════════════════════
  // PROTECTION & ANALYTICS
  // ═════════════════════════════════════════════════════════════════

  enableProtections() {
    if (!this.isProtected) return;

    // Disable context menu
    document.addEventListener('contextmenu', e => e.preventDefault());

    // Disable text selection on protected content
    document.addEventListener('selectstart', e => {
      if (e.target.closest('.slide-content')) {
        e.preventDefault();
      }
    });

    // Disable common save/inspect shortcuts
    document.addEventListener('keydown', e => {
      const forbidden = [
        e.ctrlKey && e.key === 's', // Save
        e.ctrlKey && e.key === 'u', // View source
        e.ctrlKey && e.key === 'p', // Print
        e.ctrlKey && e.shiftKey && e.key === 'I', // DevTools
        e.ctrlKey && e.shiftKey && e.key === 'C', // DevTools
        e.ctrlKey && e.shiftKey && e.key === 'J', // DevTools
        e.key === 'F12' // DevTools
      ];

      if (forbidden.some(Boolean)) {
        e.preventDefault();
        this.showProtectionNotice();
      }
    });

    // Disable drag operations
    document.addEventListener('dragstart', e => e.preventDefault());

    // Clear console periodically (mild obfuscation)
    if (typeof console !== 'undefined') {
      setInterval(() => {
        console.clear();
        console.log('%cSME Gems', 'color: #f39c12; font-size: 24px; font-weight: bold;');
        console.log('%cContent is protected. Unauthorized copying is prohibited.', 'color: #e74c3c;');
      }, 5000);
    }
  }

  showProtectionNotice() {
    if (document.querySelector('.protection-notice')) return;

    const notice = document.createElement('div');
    notice.className = 'protection-notice';
    notice.innerHTML = `
      <div class="notice-content">
        <div class="notice-icon">🛡️</div>
        <div class="notice-text">Content is protected</div>
      </div>
    `;

    document.body.appendChild(notice);

    setTimeout(() => {
      notice.classList.add('show');
      setTimeout(() => {
        notice.classList.remove('show');
        setTimeout(() => notice.remove(), 300);
      }, 2000);
    }, 10);
  }

  async logAccess(slug) {
    try {
      await fetch(`${this.config.supabaseUrl}/rest/v1/access_logs`, {
        method: 'POST',
        headers: {
          'apikey': this.config.supabaseKey,
          'Authorization': `Bearer ${this.config.supabaseKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          slug,
          user_agent: navigator.userAgent,
          ip_address: null // Would need a service to get real IP
        })
      });
    } catch (e) {
      // Silently fail - analytics shouldn't break the experience
    }
  }

  // ═════════════════════════════════════════════════════════════════
  // INITIALIZATION
  // ═════════════════════════════════════════════════════════════════

  async init() {
    const container = document.getElementById('deck-root');
    const loadingEl = document.getElementById('loading');

    // Extract slug from URL
    const slug = this.extractSlugFromURL();
    
    if (!slug) {
      container.innerHTML = this.renderErrorState('No report specified');
      return;
    }

    try {
      // Show loading
      if (loadingEl) loadingEl.style.display = 'flex';

      // Log access
      this.logAccess(slug);

      // Fetch and decode content
      const { htmlContent, slideStructure } = await this.fetchAndDecode(slug);
      
      // Parse into slides
      this.slides = this.parseSlides(htmlContent, slideStructure);

      // Hide loading
      if (loadingEl) loadingEl.style.display = 'none';

      // Render the deck
      this.renderDeck(container);

      // Enable protections
      this.enableProtections();

      // Set document title
      document.title = `${slug} • SME Gems`;

    } catch (error) {
      if (loadingEl) loadingEl.style.display = 'none';
      container.innerHTML = this.renderErrorState(`Report "${slug}" could not be loaded`);
    }
  }

  extractSlugFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    
    // Check URL parameters first
    let slug = urlParams.get('slug') || urlParams.get('report');
    
    if (!slug) {
      // Extract from path: /SMEGems/Oriana.html -> Oriana
      const pathMatch = window.location.pathname.match(/\/([^/]+)\.html$/);
      if (pathMatch && !['index', 'viewer', '404'].includes(pathMatch[1])) {
        slug = pathMatch[1];
      }
    }
    
    return slug;
  }

  renderErrorState(message) {
    return `
      <div class="error-state">
        <div class="error-icon">
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
            <circle cx="24" cy="24" r="22" stroke="currentColor" stroke-width="2"/>
            <path d="M16 16L32 32M32 16L16 32" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </div>
        <h2 class="error-title">Report not available</h2>
        <p class="error-message">${message}</p>
        <a href="/SMEGems/" class="error-link">← Back to SME Gems</a>
      </div>
    `;
  }
}

// ═══════════════════════════════════════════════════════════════════
// AUTO-INITIALIZE
// ═══════════════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {
  const decoder = new SMEGemsDecoder();
  decoder.init();
});
