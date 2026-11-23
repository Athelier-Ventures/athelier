import test from "node:test";
import assert from "node:assert/strict";
import { configuredUnitPriceCents } from "../src/lib/commerce.ts";

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
