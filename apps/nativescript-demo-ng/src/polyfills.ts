
import "@nativescript/core/globals";
import "zone.js/dist/zone.js";
import "@nativescript/angular/lib/zone-patches";
// optional: patch connectivity
import "@nativescript/angular/lib/zone-patches/connectivity";
import { Label, Observable, View } from "@nativescript/core";

const t = new Label();

t.addEventListener("test", function() {
    console.log(this);
    console.log("test Zone:", Zone.current.name);
}, {
    v: 1
});

const zone2 = Zone.current.fork({
    name: "zone2",

});
console.log("1");

zone2.run(() => {
    t.addEventListener("test", function() {
        console.log(this);
        console.log("test Zone2:", Zone.current.name);
    }, {
        v: 2
    });
});
t.notify({
    eventName: "test",
    object: null
});
console.log("2");

// (new Label()).on("test", () => console.log("test Zone:", Zone.current.name););