import assert from "node:assert/strict";
import test from "node:test";

const baseUrl = process.env.RADIATION_TEST_BASE_URL ?? "http://127.0.0.1:1654";

test("radiation method catalog exposes 20 core functions and 14 workflows", async () => {
  const response = await fetch(`${baseUrl}/api/radiation/methods`);
  assert.equal(response.status, 200, "Start the app with npm run dev or npm run start before this HTTP test.");
  const data = await response.json();
  assert.equal(data.methods.length, 34);
  assert.equal(data.counts.core, 20);
  assert.equal(data.counts.workflows, 14);
});

test("every catalogued radiation method has an executable fixture", async () => {
  const [catalogResponse, suiteResponse] = await Promise.all([
    fetch(`${baseUrl}/api/radiation/methods`),
    fetch(`${baseUrl}/api/radiation/methods`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ runAll: true }),
    }),
  ]);
  assert.equal(catalogResponse.status, 200);
  assert.equal(suiteResponse.status, 200);
  const catalog = await catalogResponse.json();
  const suite = await suiteResponse.json();
  const methodIds = catalog.methods.map((item) => item.id).sort();
  const resultIds = suite.results.map((item) => item.id).sort();
  assert.deepEqual(resultIds, methodIds);
  assert.equal(suite.results.length, 34);
  assert.equal(suite.passed + suite.guarded, 34);
});

test("interactive simulation API exposes and runs all scenarios A-S", async () => {
  const catalogResponse = await fetch(`${baseUrl}/api/radiation/simulate`);
  assert.equal(catalogResponse.status, 200);
  const catalog = await catalogResponse.json();
  assert.equal(catalog.scenarios.length, 19);
  for (const scenario of catalog.scenarios) {
    const response = await fetch(`${baseUrl}/api/radiation/simulate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scenarioId: scenario.id, parameters: scenario.defaultParameters }),
    });
    assert.equal(response.status, 200, `Scenario ${scenario.id} must execute.`);
    const data = await response.json();
    assert.equal(data.result.scenarioId, scenario.id);
  }
});

test("simulation API rejects non-object JSON payloads and explicit null parameters", async () => {
  for (const body of ["null", "[]", JSON.stringify({ scenarioId: "A", parameters: null })]) {
    const response = await fetch(`${baseUrl}/api/radiation/simulate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    });
    assert.equal(response.status, 400);
    const data = await response.json();
    assert.equal(typeof data.error, "string");
  }
});
