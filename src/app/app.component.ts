import {
  Component,
  OnInit,
  ViewChild,
  ElementRef,
  ChangeDetectorRef,
  ɵsetCurrentInjector,
} from '@angular/core';
import Hammer from 'hammerjs';
@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
})
export class AppComponent implements OnInit {
  @ViewChild('video')
  public video: ElementRef;

  @ViewChild('canvas')
  public canvas: ElementRef;

  canvasHeight = 20;
  canvasWidth = 20;
  current = {
    x: 0,
    y: 0,
    z: 1,
    zooming: false,
    width: 640 * 1,
    height: 480 * 1,
  };
  styleObject = { height: this.canvasHeight, width: this.canvasWidth };

  public captures: Array<any>;

  public constructor(private cdr: ChangeDetectorRef) {
    this.captures = [];
  }

  public ngOnInit() {
    const log = (e) => {
      console.log(e);
    };

    console.log(window.screen.orientation.type);
    window.onorientationchange = (event) => {
      console.log(window.screen.orientation.type);
      this.initializeCamera();
    };
    this.initializeCamera();
  }

  public ngAfterViewInit() {}

  logStats = () => {
    let video = document.getElementById('video');
    let container = document.getElementById('container');

    console.log(
      'container',
      container.offsetWidth,
      container.offsetHeight,
      container.getBoundingClientRect()
    );
    console.log(
      'video',
      video.offsetWidth,
      video.offsetHeight,
      video.getBoundingClientRect()
    );
  };
  public applyCanvasDimensions = () => {
    let container = document.getElementById('container');
    container.setAttribute(
      'style',
      `height:${this.canvasHeight}px;width:${this.canvasWidth}px;overflow:hidden;background-color:red`
    );

    let canvas = document.getElementById('canvas');
    canvas.setAttribute(
      'style',
      `height:${this.canvasHeight}px;width:${this.canvasWidth}px;`
    );
    this.cdr.detectChanges();
  };

  public initializeCamera = () => {
    let video = document.querySelector('#video');
    if (
      video &&
      navigator.mediaDevices &&
      navigator.mediaDevices.getUserMedia
    ) {
      navigator.mediaDevices.getUserMedia({ video: true }).then((stream) => {
        let { width, height } = stream.getTracks()[0].getSettings();
        console.log(`${width}x${height}`);
        // 640x480 device dimension automatically updated by orientation!
        this.canvasHeight = height;
        this.canvasWidth = width;
        this.applyCanvasDimensions();

        (video as any).srcObject = stream;
        //hammer needs to be in here to get correct canvas width and height
        this.setupHammerJs();
      });
    }
  };

  public capture() {
    console.log(this.canvasWidth, this.canvasHeight);
    const halfWidthAddedByZoom =
      (this.current.z * this.canvasWidth - this.canvasWidth) / 2;
    const newX =
      (halfWidthAddedByZoom - this.current.x) / ((this.current.z - 1) * 2) || 0;

    const halfHeightAddedByZoom =
      (this.current.z * this.canvasHeight - this.canvasHeight) / 2;

    const newY =
      (halfHeightAddedByZoom - this.current.y) / ((this.current.z - 1) * 2) ||
      0;

    console.log(
      newX,
      newY,
      this.canvasWidth / this.current.z,
      this.canvasHeight / this.current.z
    );
    const vid = document.getElementById('video');
    var context = this.canvas.nativeElement.getContext('2d').drawImage(
      this.video.nativeElement,
      newX, //need proportion
      newY, //need proportion
      this.canvasWidth / this.current.z, // need proportion
      this.canvasHeight / this.current.z, //need proportion
      0,
      0,
      this.canvasWidth / 2,
      this.canvasHeight / 2
    );
    console.log(this.canvas.nativeElement.toDataURL('image/png'));
    this.captures.push(this.canvas.nativeElement.toDataURL('image/png'));
  }

  setupHammerJs = () => {
    // create a simple instance
    // by default, it only adds horizontal recognizers
    var element = document.getElementById('video');
    var hammertime = new Hammer(element, {});

    hammertime.get('pinch').set({ enable: true });
    hammertime.get('pan').set({ threshold: 0 });

    var fixHammerjsDeltaIssue = undefined;
    var pinchStart = { x: undefined, y: undefined };
    var lastEvent = undefined;

    var originalSize = {
      width: this.canvasWidth,
      height: this.canvasHeight,
    };

    this.current = {
      x: 0,
      y: 0,
      z: 1,
      zooming: false,
      width: originalSize.width * 1,
      height: originalSize.height * 1,
    };

    var last = {
      x: this.current.x,
      y: this.current.y,
      z: this.current.z,
    };

    function getRelativePosition(element, point, originalSize, scale) {
      var domCoords = getCoords(element);

      var elementX = point.x - domCoords.x;
      var elementY = point.y - domCoords.y;

      var relativeX = elementX / ((originalSize.width * scale) / 2) - 1;
      var relativeY = elementY / ((originalSize.height * scale) / 2) - 1;
      return { x: relativeX, y: relativeY };
    }

    function getCoords(elem) {
      // crossbrowser version
      var box = elem.getBoundingClientRect();

      var body = document.body;
      var docEl = document.documentElement;

      var scrollTop = window.pageYOffset || docEl.scrollTop || body.scrollTop;
      var scrollLeft =
        window.pageXOffset || docEl.scrollLeft || body.scrollLeft;

      var clientTop = docEl.clientTop || body.clientTop || 0;
      var clientLeft = docEl.clientLeft || body.clientLeft || 0;

      var top = box.top + scrollTop - clientTop;
      var left = box.left + scrollLeft - clientLeft;

      return { x: Math.round(left), y: Math.round(top) };
    }

    function scaleFrom(zoomOrigin, currentScale, newScale) {
      var currentShift = getCoordinateShiftDueToScale(
        originalSize,
        currentScale
      );
      var newShift = getCoordinateShiftDueToScale(originalSize, newScale);

      var zoomDistance = newScale - currentScale;

      var shift = {
        x: currentShift.x - newShift.x,
        y: currentShift.y - newShift.y,
      };

      var output = {
        x: zoomOrigin.x * shift.x,
        y: zoomOrigin.y * shift.y,
        z: zoomDistance,
      };
      return output;
    }

    function getCoordinateShiftDueToScale(size, scale) {
      var newWidth = scale * size.width;
      var newHeight = scale * size.height;
      var dx = (newWidth - size.width) / 2;
      var dy = (newHeight - size.height) / 2;
      return {
        x: dx,
        y: dy,
      };
    }

    hammertime.on('doubletap', (e) => {
      var scaleFactor = 1;
      if (this.current.zooming === false) {
        this.current.zooming = true;
      } else {
        this.current.zooming = false;
        scaleFactor = -scaleFactor;
      }

      element.style.transition = '0.3s';
      setTimeout(() => {
        element.style.transition = 'none';
      }, 300);

      var zoomOrigin = getRelativePosition(
        element,
        { x: e.center.x, y: e.center.y },
        originalSize,
        this.current.z
      );
      var d = scaleFrom(
        zoomOrigin,
        this.current.z,
        this.current.z + scaleFactor
      );
      this.current.x += d.x;
      this.current.y += d.y;
      this.current.z += d.z;

      last.x = this.current.x;
      last.y = this.current.y;
      last.z = this.current.z;

      update();
    });
    let logStats = this.logStats;
    hammertime.on('pan', (e) => {
      if (lastEvent !== 'pan') {
        fixHammerjsDeltaIssue = {
          x: e.deltaX,
          y: e.deltaY,
        };
      }
      console.log('deltas', fixHammerjsDeltaIssue);
      this.current.x = last.x + e.deltaX - fixHammerjsDeltaIssue.x;
      this.current.y = last.y + e.deltaY - fixHammerjsDeltaIssue.y;

      lastEvent = 'pan';
      logStats();
      update();
    });

    hammertime.on('pinch', (e) => {
      var d = scaleFrom(pinchZoomOrigin, last.z, last.z * e.scale);
      this.current.x = d.x + last.x + e.deltaX;
      this.current.y = d.y + last.y + e.deltaY;
      this.current.z = d.z + last.z;
      lastEvent = 'pinch';
      update();
    });

    var pinchZoomOrigin = undefined;
    hammertime.on('pinchstart', (e) => {
      pinchStart.x = e.center.x;
      pinchStart.y = e.center.y;
      pinchZoomOrigin = getRelativePosition(
        element,
        { x: pinchStart.x, y: pinchStart.y },
        originalSize,
        this.current.z
      );
      lastEvent = 'pinchstart';
    });

    hammertime.on('panend', (e) => {
      last.x = this.current.x;
      last.y = this.current.y;
      lastEvent = 'panend';
    });

    hammertime.on('pinchend', (e) => {
      last.x = this.current.x;
      last.y = this.current.y;
      last.z = this.current.z;
      lastEvent = 'pinchend';
    });

    const update = () => {
      this.current.height = originalSize.height * this.current.z;
      this.current.width = originalSize.width * this.current.z;

      const addedX = this.current.width - originalSize.width;
      const addedY = this.current.height - originalSize.height;

      const xOutOfBounds = Math.abs(this.current.x) > addedX / 2; // we don't know which direction yet
      const yOutOfBounds = Math.abs(this.current.y) > addedY / 2; // we don't know which direction yet

      if (xOutOfBounds) {
        this.current.x = this.current.x < 0 ? -(addedX / 2) : addedX / 2;
      }

      if (yOutOfBounds) {
        this.current.y = this.current.y < 0 ? -(addedY / 2) : addedY / 2;
      }

      element.style.transform =
        'translate3d(' +
        this.current.x +
        'px, ' +
        this.current.y +
        'px, 0) scale(' +
        this.current.z +
        ')';

      console.log('current', this.current);
    };
  };
}
