/// <reference path='../../test.ts' />
/// <reference path='../../typings/mocha.d.ts' />
/// <reference path='../../../src/pbot/grove/model.ts' />
/// <reference path='../../../src/pbot/grove/operation.ts' />


let GroveModel = Grove.Model;
let GroveOp = Grove.Operation;
let Address = Grove.Address;
let NodeType = Grove.NodeType;

describe('Grove Model', () => {
  describe('Model Tests', () => {
    it('equality', () => {
      let t0 = {
        id: GroveModel.ROOT_ID,
      }

      let t1 = {
        id: GroveModel.ROOT_ID,
        properties: { tag: 'a' }
      }

      let t2 = {
        id: GroveModel.ROOT_ID,
        properties: { tag: 'a' },
        children: [
          {
            properties: { tag: 'a', content: 'blah' }
          },

          {
            properties: { tag: 'html' }

          },

          {
            properties: { tag: 'img' }
          }
        ]
      };

      let model0 = GroveModel.fromJson([t0]);
      let model1 = GroveModel.fromJson([t1]);
      let model2 = GroveModel.fromJson([t2]);

      assert(!model0.equals(model1), "model0 should not be equal to model1");
      assert(model0.equals(model0), "model0 should equal model0");

      t2['children'][0]['properties']['tag'] = 'b';
      let model3 = GroveModel.fromJson([t2]);
      assert(!model2.equals(model3), "model2 should not be equal to model3");
    });

    it('Just a bunch of random junk as a sanity test', () => {
      let model = new GroveModel();

      // Adds

      model.addChild([0], { tag: 'a', content: 'hello' });
      assertEqual(model.render(), '<a>hello</a>', '');

      model.addChild([1], { tag: 'b', content: 'bye' });
      assertEqual(model.render(), '<a>hello</a><b>bye</b>', '');

      model.addChild([0, 0], { tag: 'c', content: 'mornin' });
      assertEqual(model.render(), '<a>hello<c>mornin</c></a><b>bye</b>', '');

      model.addChild([0, 1], { tag: 'd', content: 'bloom' });
      assertEqual(model.render(), '<a>hello<c>mornin</c><d>bloom</d></a><b>bye</b>', '');

      // Removes

      model.removeChild([0]);
      assertEqual(model.render(), '<b>bye</b>', '');

      // Updates

      model.updateChild([0], { 'content': 'hello' });
      assertEqual(model.render(), '<b>hello</b>', '');

      model.updateChild([0], { 'tag': 'c' });
      assertEqual(model.render(), '<c>hello</c>', '');
    });
  });
});