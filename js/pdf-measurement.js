(function(w,d){
  var sdk;
  w.tsPDF={
    load:function(){
      if(w.AdobeDC)return Promise.resolve();
      if(sdk)return sdk;
      sdk=new Promise(function(resolve,reject){
        var timeout=setTimeout(function(){reject(new Error('PDF viewer timeout'));},15000);
        d.addEventListener('adobe_dc_view_sdk.ready',function(){clearTimeout(timeout);resolve();},{once:true});
        var script=d.createElement('script');script.src='https://acrobatservices.adobe.com/view-sdk/viewer.js';
        script.onerror=function(){clearTimeout(timeout);reject(new Error('PDF viewer unavailable'));};d.head.appendChild(script);
      });
      return sdk;
    },
    listen:function(view,documentId){
      view.registerCallback(w.AdobeDC.View.Enum.CallbackType.EVENT_LISTENER,function(event){
        var types=['DOCUMENT_OPEN','PAGE_VIEW','DOCUMENT_DOWNLOAD','DOCUMENT_PRINT','BOOKMARK_ITEM_CLICK','HYPERLINK_OPEN','TEXT_COPY','TEXT_SEARCH','ZOOM_LEVEL'];
        if(types.indexOf(event.type)<0||!w.tsMeasurement)return;
        var page=event.data&&event.data.pageNumber;
        w.tsMeasurement.track('pdf_interaction',{document_id:documentId,pdf_event:event.type,pdf_page:Number.isInteger(page)&&page>0&&page<100000?String(page):''});
      },{enablePDFAnalytics:true});
    }
  };
})(window,document);
