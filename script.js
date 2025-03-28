var vars = {};
var parts = window.location.href.replace(/[?&]+([^=&]+)=([^&]*)/gi, function(m,key,value) {
    vars[key] = value;
});

var vMixSettings = {
    IP: "127.0.0.1",
    port: "8088",
    multiViewInput: 0,
    previousProgram: -1,
    preivousPreview: -1,
    refreshInterval: 150,
}

function search(key, keyValue, Array){
    for (var i=0; i < Array.length; i++) {
        if (Array[i][key] === keyValue) {
            return Array[i];
        }
    }
}

function toTitleCase(str) {
    return str.replace(/(?:^|\s)\w/g, function(match) {
        return match.toUpperCase();
    });
}

var saveSettings = [
    "zoomY",
    "zoomX",
    "panX",
    "panY",
    "color",
    "enabled",
    "fontSize",
]

var extras = [
    {
        name: "clock",
        zoomY: 50,
        zoomX: 50,
        panX: 0,
        panY: 0,
        color: "#ffffff",
        enabled: false,
        fontSize: 70,
        template: function(obj){
            var templateString = `
            <div class="multiViewBox" style="
                height: ${obj.zoomY}%;
                width:  ${obj.zoomX}%;
                left:   ${((obj.panX)/2) + 50}%;
                top:    ${((obj.panY*-1)/2) + 50}%;
            ">
            <div id="clock" style="color: ${obj.color}; font-size: ${obj.fontSize}px"></div>
            <div class="inputTitle">${toTitleCase(obj.name)}</div>
            </div>
            `
            return templateString
        },
    },
    {
        name: "countdown",
        zoomY: 50,
        zoomX: 50,
        panX: 0,
        panY: 0,
        color: "#ffffff",
        enabled: false,
        fontSize: 70,
        template: function(obj){
            var templateString = `
            <div class="multiViewBox" style="
                height: ${obj.zoomY}%;
                width:  ${obj.zoomX}%;
                left:   ${((obj.panX)/2) + 50}%;
                top:    ${((obj.panY*-1)/2) + 50}%;
            ">
            <div id="countdown" style="color: ${obj.color}; font-size: ${obj.fontSize}px"></div>
            <div class="inputTitle">${toTitleCase(obj.name)}</div>
            </div>
            `
            return templateString
        },
    },
    {
        name: "status",
        zoomY: 50,
        zoomX: 50,
        panX: 0,
        panY: 0,
        enabled: false,
        fontSize: 36,
        template: function(obj){
            var templateString = `
            <div class="multiViewBox" style="
                height: ${obj.zoomY}%;
                width:  ${obj.zoomX}%;
                left:   ${((obj.panX)/2) + 50}%;
                top:    ${((obj.panY*-1)/2) + 50}%;
            ">
                <div class="vMixStatuses" style="font-size: ${obj.fontSize}px">
                    <div class="column">
            `;
            vMixStatuses.forEach((status, i) => {
                if(i == 3){
                    templateString += `</div><div class="column">`
                }
                if(vMixSettings[status]){
                    templateString += `<div class="vMixStatus vMixStatusEnabled ${status}  ">${status.toUpperCase()}: </div>`
                }
                else{
                    templateString += `<div class="vMixStatus ${status}  ">${status.toUpperCase()}: </div>`
                }
            });
            templateString += `
                </div>
            </div>
            <div class="inputTitle">${toTitleCase(obj.name)}</div>
            `
            return templateString
        },
    },
]


if(vars["Input"]){
    vMixSettings.multiViewInput = parseFloat(vars["Input"]) - 1;
 }

 if(vars["Interval"]){
    vMixSettings.refreshInterval = parseFloat(vars["Interval"]);
 }
 if(vars["Settings"]){
    var parsedSettings = JSON.parse(decodeURIComponent(vars.Settings))
    parsedSettings.forEach((extra, i) => {
        Object.keys(extra).forEach(property =>{
            extras[i][property] = extra[property]
        })
    })
 }

setInterval(() => {
    
    fetch('http://' + vMixSettings.IP + ':' + vMixSettings.port + '/api')
    .then(response => response.text())
    .then(str => (new window.DOMParser()).parseFromString(str, "text/xml"))
    .then(data => vMixRefresh(data));

}, vMixSettings.refreshInterval);

var overlayArray = [];
var multiViewOverlays = [];
var lastResponse;
var vMixInputs = []

function log10(x) {
    // Convert to dB scale with proper reference level for audio meters
    // Audio meters typically show from 0dB to -60dB (or lower)
    if (x <= 0) {
        return 0; // Silent
    }
    
    // Convert to decibels (20 * log10(x)) with proper scaling
    // x is typically between 0 and 1 from vMix
    const dB = 20 * Math.log10(x);
    
    // Map from dB range to percentage (0 to 100)
    // 0dB -> 100%, -60dB -> 0%
    const minDb = -60; // Minimum dB to display
    
    // Calculate percentage: 0dB = 100%, minDb = 0%
    const percentage = Math.max(0, Math.min(100, (dB - minDb) * 100 / Math.abs(minDb)));
    
    return percentage;
}

var vMixStatuses = [
    "recording",
    "external",
    "streaming",
    "playList",
    "multiCorder",
    "fullscreen",
]

function vMixRefresh(data){
    lastResponse = data;
    var temporaryMultiViewOverlays = []
    vMixSettings.previewNumber = parseFloat(data.getElementsByTagName("preview")[0].innerHTML)
    vMixSettings.programNumber = parseFloat(data.getElementsByTagName("active")[0].innerHTML)
    vMixSettings.previewKey = data.querySelector(`[number="${vMixSettings.previewNumber}"]`).getAttribute("key")
    vMixSettings.programKey = data.querySelector(`[number="${vMixSettings.programNumber}"]`).getAttribute("key")

    // Get master volume data
    const masterVolume = data.getElementsByTagName("master")[0];
    const masterMeterF1 = masterVolume ? masterVolume.getAttribute("meterF1") : null;
    const masterMeterF2 = masterVolume ? masterVolume.getAttribute("meterF2") : null;
    const masterMuted = masterVolume ? masterVolume.getAttribute("muted") === "True" : false;

    // Add master audio data to vMixInputs array
    vMixInputs.master = {
        audio: true,
        muted: masterMuted,
        audioL: masterMeterF1 !== null ? log10(parseFloat(masterMeterF1)) : 0,
        audioR: masterMeterF2 !== null ? log10(parseFloat(masterMeterF2)) : 0
    };

    Array.prototype.slice.call(data.getElementsByTagName("input"), 0 ).forEach(function(input, i){
        vMixInputs[i] = {}
        vMixInputs[i].title = input.getAttribute("title");
        vMixInputs[i].key = input.getAttribute("key");
        
        // Detect if this is an "Output" input for master audio
        vMixInputs[i].isOutput = vMixInputs[i].title === "Output";
        
        const meterF1 = input.getAttribute("meterF1");
        const meterF2 = input.getAttribute("meterF2");
        
        if (meterF1 !== null && meterF2 !== null) {
            vMixInputs[i].audio = true;
            vMixInputs[i].muted = input.getAttribute("muted") === "True";
            
            const leftLevel = parseFloat(meterF1);
            const rightLevel = parseFloat(meterF2);
            
            vMixInputs[i].audioL = log10(leftLevel);
            vMixInputs[i].audioR = log10(rightLevel);
        } else {
            vMixInputs[i].audio = false;
        }
        
        if(input.getAttribute("duration")){
            vMixInputs[i].video = true
            vMixInputs[i].duration = input.getAttribute("duration")
            vMixInputs[i].position = input.getAttribute("position")
        }
        else{
            vMixInputs[i].video = false
        }
    })
    
    overlayArray = Array.prototype.slice.call(data.getElementsByTagName("input")[vMixSettings.multiViewInput].getElementsByTagName("overlay"), 0 );

    if(overlayArray.length == 0){
        $(".warning").html("No multiview layers on input " + (parseFloat(vMixSettings.multiViewInput) + 1));
        $(".warning").css("display", "flex");
    }
    else{
        $(".warning").css("display", "none");
    }

    
    
    for(var i = 0; i < overlayArray.length && i < 9; i++){
        if(parseFloat(overlayArray[i].getAttribute("index")) != 9){

            if(overlayArray[i].getElementsByTagName("position")[0] != undefined){
                var zoomY =     (parseFloat(overlayArray[i].getElementsByTagName("position")[0].getAttribute("zoomY"))   *   100);
                var zoomX =     (parseFloat(overlayArray[i].getElementsByTagName("position")[0].getAttribute("zoomX"))   *   100);
                var panY =      (parseFloat(overlayArray[i].getElementsByTagName("position")[0].getAttribute("panY"))    *   100);
                var panX =      (parseFloat(overlayArray[i].getElementsByTagName("position")[0].getAttribute("panX"))    *   100);
                var inputKey =  overlayArray[i].getAttribute("key")
                var inputName =  lastResponse.querySelector(`input[key="${inputKey}"]`).getAttribute("title")
            }
            else{
                var zoomY =     (100);
                var zoomX =     (100);
                var panY =      (0);
                var panX =      (0);
                var inputKey =  overlayArray[i].getAttribute("key")
                var inputName =  lastResponse.querySelector(`input[key="${inputKey}"]`).getAttribute("title")

            }

            temporaryMultiViewOverlays[i] = {
                zoomX,
                zoomY,
                panX,
                panY,
                inputKey,
                inputName,
                isOutput: lastResponse.querySelector(`input[key="${inputKey}"]`).getAttribute("title") === "Output"
            }
                        
        }
    }
    
    var forceRefresh = false
    vMixStatuses.forEach(status => {
        if(vMixSettings[status] != (data.getElementsByTagName(status)[0].innerHTML == "True")){
            vMixSettings[status] = data.getElementsByTagName(status)[0].innerHTML == "True"
            forceRefresh = true
        }
    })
    if(JSON.stringify(temporaryMultiViewOverlays) != JSON.stringify(multiViewOverlays) || forceRefresh){
        multiViewOverlays = JSON.parse(JSON.stringify(temporaryMultiViewOverlays))
        refresh();
        updateTally(true);
        
    }
    updateTally();
    updateVU();
}

function updateVU(){
    overlayArray.forEach((overlay, i) => {
        const inputIndex = vMixInputs.findIndex(input => input.key === overlay.getAttribute("key"));
        
        // Check if multiViewOverlays[i] exists before accessing its properties
        const outputBox = i < multiViewOverlays.length && multiViewOverlays[i] ? 
                          multiViewOverlays[i].isOutput : false;
        
        // Show VU meters if the input has audio OR if it's the Output box (for master audio)
        if ((inputIndex >= 0 && vMixInputs[inputIndex].audio) || outputBox) {
            // For output box, always use master audio
            // For regular inputs with audio, use their own levels
            const useValues = outputBox && vMixInputs.master ? 
                { 
                    audioL: vMixInputs.master.audioL, 
                    audioR: vMixInputs.master.audioR,
                    muted: vMixInputs.master.muted
                } : 
                {
                    audioL: inputIndex >= 0 ? vMixInputs[inputIndex].audioL : 0,
                    audioR: inputIndex >= 0 ? vMixInputs[inputIndex].audioR : 0,
                    muted: inputIndex >= 0 ? vMixInputs[inputIndex].muted : false
                };
            
            // The clip path should match the percentage directly
            const leftClipPercent = Math.max(0, 100 - useValues.audioL);
            const rightClipPercent = Math.max(0, 100 - useValues.audioR);
            
            // Apply clip path for proper visual display
            $($(".outerContainer").children()[i]).find(".actualMeterL").css("clip-path", `inset(${leftClipPercent}% 0% 0% 0%)`);
            $($(".outerContainer").children()[i]).find(".actualMeterR").css("clip-path", `inset(${rightClipPercent}% 0% 0% 0%)`);
            
            // Make sure meters are visible with proper opacity
            $($(".outerContainer").children()[i]).find(".actualMeterL").css("opacity", "0.7");
            $($(".outerContainer").children()[i]).find(".actualMeterR").css("opacity", "0.7");
            
            if (useValues.muted) {
                $($(".outerContainer").children()[i]).find(".actualMeterR").css("filter", "grayscale(100%)");
                $($(".outerContainer").children()[i]).find(".actualMeterL").css("filter", "grayscale(100%)");
            } else {
                $($(".outerContainer").children()[i]).find(".actualMeterR").css("filter", "grayscale(0%)");
                $($(".outerContainer").children()[i]).find(".actualMeterL").css("filter", "grayscale(0%)");
            }
        }
    });
}

function generateVU(bool, overlay, isMaster = false){
    if(bool){
        return(`
        <div class="leftAlignContainer">
        <div class="audioMeterContainer">
            <div class="audioMeter">
                <div class="meterOutline"></div>
                <div class="actualMeter actualMeterL" style="opacity: 0.7;"></div>
            </div>
            <div class="audioMeter">
                <div class="meterOutline"></div>
                <div class="actualMeter actualMeterR" style="opacity: 0.7;"></div>
            </div>
            <div class="VUlabels">
                <div class="VUlabel" style="transform: scale(${overlay.zoomY / 100})">0</div>
                <div class="VUlabel" style="transform: scale(${overlay.zoomY / 100})">-5</div>
                <div class="VUlabel" style="transform: scale(${overlay.zoomY / 100})">-10</div>
                <div class="VUlabel" style="transform: scale(${overlay.zoomY / 100})">-15</div>
                <div class="VUlabel" style="transform: scale(${overlay.zoomY / 100})">-20</div>
                <div class="VUlabel" style="transform: scale(${overlay.zoomY / 100})">-25</div>
                <div class="VUlabel" style="transform: scale(${overlay.zoomY / 100})">-30</div>
                <div class="VUlabel" style="transform: scale(${overlay.zoomY / 100})">-40</div>
                <div class="VUlabel" style="transform: scale(${overlay.zoomY / 100})">-50</div>
                <div class="VUlabel" style="transform: scale(${overlay.zoomY / 100})">-60</div>
            </div>
        </div>
        <div class="LRlabels">
            <div class="LRlabel" style="transform: scale(${overlay.zoomY / 100})">
                L
            </div>
            <div class="LRlabel" style="transform: scale(${overlay.zoomY / 100})">
                R
            </div>
        </div>
    </div>
        `)
    }
    else{
        return ""
    }
}

function refresh(){
    var saveArray = []
    extras.forEach((extra, i) => {
        if(saveArray[i] == undefined){
            saveArray[i] = {}
        }
        saveSettings.forEach(setting =>{
            saveArray[i][setting] = extra[setting]
        })
    });
    $("#saveURL").val("https://multiview.multicam.media?Settings=" + encodeURIComponent(JSON.stringify(saveArray)))
    clockTick();
    $(".outerContainer").html("")
    multiViewOverlays.forEach(overlay => {
        // Determine if this is an Output overlay
        const isOutput = overlay.isOutput;
        
        // Find the input index - we'll need this to check for audio
        const inputIndex = vMixInputs.findIndex(input => input.key === overlay.inputKey);
        
        // Generate HTML for the multiview box
        $(".outerContainer").append(`
        <div class="multiViewBox${isOutput ? ' outputBox' : ''}" style="
            height: ${overlay.zoomY}%;
            width:  ${overlay.zoomX}%;
            left:   ${((overlay.panX)/2) + 50}%;
            top:    ${((overlay.panY*-1)/2) + 50}%;
        ">
        <div class="inputTitle">${lastResponse.querySelector(`input[key="${overlay.inputKey}"]`).getAttribute("title")}</div>
        ${generateVU(
            // Show VU meters if:
            // 1. The input has audio OR
            // 2. It's the Output box (for master audio)
            (inputIndex >= 0 && vMixInputs[inputIndex]?.audio) || isOutput, 
            overlay,
            isOutput
        )}
        </div>
        `)
    });
    extras.forEach(extra => {
    
        if(extra.enabled == true){
            $(".outerContainer").append(extra.template(extra))
        }
    });
    
}

function updateTally(force){
    if(vMixSettings.previousPreviewKey != vMixSettings.previewKey || force){
        if(multiViewOverlays.findIndex(overlay => overlay.inputKey === vMixSettings.previousPreviewKey) != -1){
            $($(".outerContainer").children()[multiViewOverlays.findIndex(overlay => overlay.inputKey === vMixSettings.previousPreviewKey)]).removeClass("preview");
        }
        $($(".outerContainer").children()[multiViewOverlays.findIndex(overlay => overlay.inputKey === vMixSettings.previewKey)]).addClass("preview");
        vMixSettings.previousPreviewKey = vMixSettings.previewKey
    }
    if(vMixSettings.previousProgramKey != vMixSettings.programKey || force){
        if(multiViewOverlays.findIndex(overlay => overlay.inputKey === vMixSettings.previousProgramKey) != -1){
            $($(".outerContainer").children()[multiViewOverlays.findIndex(overlay => overlay.inputKey === vMixSettings.previousProgramKey)]).removeClass("program");
        }
        $($(".outerContainer").children()[multiViewOverlays.findIndex(overlay => overlay.inputKey === vMixSettings.programKey)]).addClass("program");
        vMixSettings.previousProgramKey = vMixSettings.programKey
    }
}

let clockTick = () => {
    let date = new Date();
    let hrs = date.getHours();
    let mins = date.getMinutes();
    let secs = date.getSeconds();
    hrs = hrs < 10 ? "0" + hrs : hrs;
    mins = mins < 10 ? "0" + mins : mins;
    secs = secs < 10 ? "0" + secs : secs;

    let time = `${hrs}:${mins}:${secs}`;
    if(search("name", "clock", extras).enabled){
        $("#clock").html(time)
    };
    setTimeout(clockTick, 1000);
}
clockTick();

function msToTime(s) {
    var ms = s % 1000;
    s = (s - ms) / 1000;
    var secs = s % 60;
    s = (s - secs) / 60;
    var mins = s % 60;
    var hrs = (s - mins) / 60;
  
    return hrs.toString().padStart(2,0) + ':' + mins.toString().padStart(2,0) + ':' + secs.toString().padStart(2,0);
  }
    
function updateCountdown(){
    if(vMixInputs[vMixSettings.programNumber - 1].video){
        var timeLeft = parseFloat(vMixInputs[vMixSettings.programNumber - 1].duration) - parseFloat(vMixInputs[vMixSettings.programNumber - 1].position)
        if(timeLeft < 10000 && timeLeft > 1){
            $("#countdown").parent().addClass("program")
            $("#countdown").parent().removeClass("preview")
        }
        else if(timeLeft < 60000 && timeLeft > 1){
            $("#countdown").parent().addClass("preview")
            $("#countdown").parent().removeClass("program")
        }
        else{
            $("#countdown").parent().removeClass("program")
            $("#countdown").parent().removeClass("preview")
        }
        $("#countdown").html(msToTime(timeLeft))
    }
    else{
        $("#countdown").html("00:00:00");
        $("#countdown").parent().removeClass("program")
        $("#countdown").parent().removeClass("preview")
    }
    
}

setInterval(() => {
    updateCountdown()
}, 200);

extras.forEach(extra => {
    $(`#${extra.name}ZoomNumber`).val(extra.zoomX/100)
    $(`#${extra.name}ZoomSlider`).val(extra.zoomX/100)
    $(`#${extra.name}ZoomSlider`).on('input',function(e){
        extra.zoomX = e.target.value * 100;
        extra.zoomY = e.target.value * 100;
        $(`#${extra.name}ZoomNumber`).val(e.target.value)
        refresh();

    });
    $(`#${extra.name}ZoomNumber`).on('input',function(e){
        extra.zoomX = e.target.value * 100;
        extra.zoomY = e.target.value * 100;
        $(`#${extra.name}ZoomSlider`).val(e.target.value)
        refresh();

    });

    $(`#${extra.name}PanYNumber`).val(extra.panY/100)
    $(`#${extra.name}PanYSlider`).val(extra.panY/100)
    $(`#${extra.name}PanYSlider`).on('input',function(e){
        extra.panY = e.target.value * 100;
        $(`#${extra.name}PanYNumber`).val(e.target.value)
        refresh();

    });
    $(`#${extra.name}PanYNumber`).on('input',function(e){
        extra.panY = e.target.value * 100;
        $(`#${extra.name}PanYSlider`).val(e.target.value)
        refresh();

    });

    $(`#${extra.name}PanXNumber`).val(extra.panX/100)
    $(`#${extra.name}PanXSlider`).val(extra.panX/100)
    $(`#${extra.name}PanXSlider`).on('input',function(e){
        extra.panX = e.target.value * 100;
        $(`#${extra.name}PanXNumber`).val(e.target.value)
        refresh();
    });
    $(`#${extra.name}PanXNumber`).on('input',function(e){
        extra.panX = e.target.value * 100;
        $(`#${extra.name}PanXSlider`).val(e.target.value)
        refresh();
    });

    $(`#${extra.name}Enable`).attr("checked", extra.enabled)
    $(`#${extra.name}Enable`).on('input',function(e){
        extra.enabled = e.target.checked;
        refresh();
    });

    $(`#${extra.name}FontSize`).val(extra.fontSize)
    $(`#${extra.name}FontSize`).on('input',function(e){
        extra.fontSize = e.target.value;
        refresh();
    });

    $(`#${extra.name}Color`).val(extra.color)
    $(`#${extra.name}Color`).on('input',function(e){
        extra.color = e.target.value;
        refresh();
    });
})
