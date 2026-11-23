import test from "node:test";
import assert from "node:assert/strict";
import { configuredUnitPriceCents, notebookDiscQuota } from "../src/lib/commerce.ts";

function fixture(allowBasePurchase = false) {
  return {
    id: "notebook", title: "Libreta", basePriceCents: 28000, currency: "MXN",
    lineIds: ["personalizaciones"], status: "published", baseMaterials: [],
    allowBasePurchase,
    optionGroups: [{
      id:"discs", title:"Discos", selection:"single", required:true,
      options:[{ id:"pink", label:"Rosa", priceCents:1400, pricingMode:"perUnit" }]
    }]
  };
}

test("standard notebook permitted only when its owner enables base-only purchase",()=>{
  assert.equal(configuredUnitPriceCents(fixture(true),[]),28000);
  assert.throws(()=>configuredUnitPriceCents(fixture(false),[]),/Invalid option count/);
});

test("priced options and product quantity yield a 756 MXN subtotal",()=>{
  const unit= configuredUnitPriceCents(fixture(true),[{groupId:"discs", optionId:"pink", units:7}]);
  assert.equal(unit,37800);
  assert.equal(unit*2,75600);
  assert.equal(configuredUnitPriceCents(fixture(true),[])*2,56000);
});

test("required groups are still enforced for nonempty configurations",()=>{
  const product=fixture(true);
  product.optionGroups.push({
    id:"cover",title:"Portada",selection:"single",required:true,
    options:[{id:"hard", label:"Dura",priceCents:1000,pricingMode:"fixed"}]
  });
  assert.throws(()=>configuredUnitPriceCents(product,[{groupId:"discs",optionId:"pink",units:1}]),/Invalid option count/);
});


function standardDiscFixture() {
  return {
    id: "8WAauuwkek11Z4pqkyAj",
    title: "Libreta Personalizada Estándar",
    basePriceCents: 28000, currency: "MXN", lineIds: ["personalizaciones"],
    status: "published", baseMaterials: [], allowBasePurchase: true,
    optionGroups: [{
      id: "extras", title: "Adicionales", selection: "multiple", required: false,
      options: [
        { id: "pink", label: "Discos color rosa", priceCents: 1400, pricingMode: "perUnit" },
        { id: "blue", label: "Discos color azul", priceCents: 1400, pricingMode: "perUnit" },
        { id: "photos", label: "Fotografias en papel fotografico", priceCents: 1000, pricingMode: "perUnit" },
      ]
    }]
  };
}
const pink = units => ({groupId:"extras",optionId:"pink",units});
const blue = units => ({groupId:"extras",optionId:"blue",units});
const photos = units => ({groupId:"extras",optionId:"photos",units});

test("8 pink discs and 8 blue discs are both valid, and mixed colours share a maximum of 8",()=>{
  const product=standardDiscFixture();
  assert.equal(configuredUnitPriceCents(product,[pink(8)]),39200);
  assert.equal(configuredUnitPriceCents(product,[blue(8)]),39200);
  assert.equal(configuredUnitPriceCents(product,[pink(5),blue(3)]),39200);
  assert.deepEqual(notebookDiscQuota(product,[pink(5),blue(3)]),{selected:8,remaining:0,maximum:8});
});

test("nine or more discs are rejected even when split among colours",()=>{
  const product=standardDiscFixture();
  for(const choices of [[pink(9)],[blue(9)],[pink(5),blue(4)],[pink(11),blue(12)]])
    assert.throws(()=>configuredUnitPriceCents(product,choices),/DISC_LIMIT_EXCEEDED/);
  assert.throws(()=>configuredUnitPriceCents(product,[pink(0)]),/DISC_LIMIT_EXCEEDED/);
});

test("disc quota ignores other per-unit extras and does not affect other products",()=>{
  const product=standardDiscFixture();
  assert.equal(configuredUnitPriceCents(product,[pink(8),photos(12)]),51200);
  assert.equal(notebookDiscQuota(product,[pink(5),blue(3),photos(10)])?.selected,8);
  assert.equal(configuredUnitPriceCents({...product,title:"Otro artículo"},[pink(12)]),44800);
  assert.equal(configuredUnitPriceCents(product,[]),28000);
});
