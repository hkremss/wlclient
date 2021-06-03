function initialize_resizing() {
  const resizable = function(resizer) {
        const direction = resizer.getAttribute('data-direction') || 'horizontal';
        const prevSibling = resizer.previousElementSibling;
        const nextSibling = resizer.nextElementSibling;

        // The current position of mouse
        let x = 0;
        let y = 0;
        let prevSiblingHeight = 0;
        let prevSiblingWidth = 0;
        let nextSiblingHeight = 0;
        let nextSiblingWidth = 0;

        // Handle the mousedown event
        // that's triggered when user drags the resizer
        const mouseDownHandler = function(e) {
            // Get the current mouse position
            x = e.clientX;
            y = e.clientY;
            const rect1 = prevSibling.getBoundingClientRect();
            prevSiblingHeight = rect1.height;
            prevSiblingWidth = rect1.width;
            const rect2 = prevSibling.getBoundingClientRect();
            nextSiblingHeight = rect2.height;
            nextSiblingWidth = rect2.width;

            // Attach the listeners to `document`
            document.addEventListener('mousemove', mouseMoveHandler);
            document.addEventListener('mouseup', mouseUpHandler);
        };

        const mouseMoveHandler = function(e) {
            // How far the mouse has been moved
            const dx = e.clientX - x;
            const dy = e.clientY - y;

            switch (direction) {
                case 'vertical':
                    const h = (prevSiblingHeight + dy) * 100 / resizer.parentNode.getBoundingClientRect().height;
                    prevSibling.style.height = `${h}%`;
                    break;
                case 'horizontal':
                default:
                    //const w = (prevSiblingWidth + dx) * 100 / resizer.parentNode.getBoundingClientRect().width;
                    //prevSibling.style.width = `${w}%`;
                    const w1 = (prevSiblingWidth + dx);
                    prevSibling.style.width = `${w1}px`;
                    const w2 = (nextSiblingWidth - dx);
                    nextSibling.style.width = `${w2}px`;
                    break;
            }

            const cursor = direction === 'horizontal' ? 'col-resize' : 'row-resize';
            resizer.style.cursor = cursor;
            document.body.style.cursor = cursor;

            prevSibling.style.userSelect = 'none';
            prevSibling.style.pointerEvents = 'none';

            nextSibling.style.userSelect = 'none';
            nextSibling.style.pointerEvents = 'none';
        };

        const mouseUpHandler = function() {
            resizer.style.removeProperty('cursor');
            document.body.style.removeProperty('cursor');

            prevSibling.style.removeProperty('user-select');
            prevSibling.style.removeProperty('pointer-events');

            nextSibling.style.removeProperty('user-select');
            nextSibling.style.removeProperty('pointer-events');

            // Remove the handlers of `mousemove` and `mouseup`
            document.removeEventListener('mousemove', mouseMoveHandler);
            document.removeEventListener('mouseup', mouseUpHandler);
        };

        // Attach the handler
        resizer.addEventListener('mousedown', mouseDownHandler);
    };

    // Query all resizers
    document.querySelectorAll('.resizer').forEach(function(ele) {
        resizable(ele);
    });

    // called on any window resize
    window.addEventListener('resize', adjustLayout);

}

// adjust layout (especially editor div sizes)
function adjustLayout() {

  var pWidth = $('div#page').width();
  var tWidth = $('div#filetree').width();

  $('div#tabs').css({
//    width: (pWidth-(tWidth+10)) + 'px',
  });
  $('div#messages').css({
//    width: (pWidth-(tWidth+10)) + 'px',
  });


/*
  var w = $('div#page').width(), h = $('div#page').height();
  var w0 = $('div#in').width();
  var w1 = $('button#send').outerWidth(true);
  var w2 = $('div#menu').outerWidth(true)+25;
  var w3 = $('div#info').width();
  $('div#in').css({
    width: (w-(w3+6)) + 'px',
  });
  $('input#cmd').css({
    width: ($('div#in').width() - (w1+w2)) + 'px',
  });
    
  //writeToScreen('w -> ' + w + 'px w0 -> '+w0+'px w1 -> '+w1+'px w2 -> '+w2+'px w3 -> '+w3+'\n');
  
  var h0 = $('div#in').outerHeight(true);
  $('div#out').css({
    width: (w-(w3+6)) + 'px',
    height: (h - h0 -2) + 'px',
  });
*/
}
