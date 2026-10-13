// Effets visuels : textes flottants et particules.
export const floats = [], parts = [];
export function floatText(x,y,text,col='#f6c453',size=15){ if(floats.length<60) floats.push({x,y,text,col,size,life:1}); }
