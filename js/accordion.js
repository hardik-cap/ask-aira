/* Accordion. Exactly one item open per [data-accordion] group; opening an
   item swaps the matching panel inside the sibling [data-acc-figs] well,
   which is how the differentiators section keeps its illustration in sync.
   Markup contract: .acc__item[data-acc-item] > h3 > button.acc__btn
   (aria-expanded) + .acc__panel. */
(function () {
  'use strict';

  document.querySelectorAll('[data-accordion]').forEach(function (acc) {
    var items = Array.prototype.slice.call(acc.querySelectorAll('[data-acc-item]'));
    var figsWrap = acc.parentElement.querySelector('[data-acc-figs]');
    var figs = figsWrap ? Array.prototype.slice.call(figsWrap.children) : [];

    function setOpen(idx) {
      items.forEach(function (item, i) {
        var open = i === idx;
        item.classList.toggle('is-open', open);
        item.querySelector('.acc__btn').setAttribute('aria-expanded', open ? 'true' : 'false');
      });
      figs.forEach(function (fig, i) {
        fig.classList.toggle('is-active', i === idx);
      });
    }

    items.forEach(function (item, i) {
      item.querySelector('.acc__btn').addEventListener('click', function () {
        /* The open item stays open: the figure well always has a subject. */
        if (!item.classList.contains('is-open')) setOpen(i);
      });
    });

    /* The side well is hidden below 992px, so each item carries a clone of
       its figure inside its own panel, revealed by the page CSS at phone
       widths. Cloned once at init, so a real <img> dropped into the well
       later travels with it. */
    figs.forEach(function (fig, i) {
      var body = items[i] && items[i].querySelector('.acc__body');
      if (!body) return;
      var clone = fig.cloneNode(true);
      clone.className = 'acc__fig';
      clone.setAttribute('aria-hidden', 'true');
      body.appendChild(clone);
    });

    setOpen(0);
  });
})();
