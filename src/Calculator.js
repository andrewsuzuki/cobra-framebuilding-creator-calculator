import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import classNames from "classnames";
import { useEffect, useState } from "react";
import frameExamples from "./frame-examples.json";

// Constants
// Primary dimensions modes
const PDM_STACK_REACH = "PDM_STACK_REACH";
const PDM_FRONT_CENTER = "PDM_FRONT_CENTER";
const PDM_ETT_TAIWANESE = "PDM_ETT_TAIWANESE";
const PDM_ETT_TT = "PDM_ETT_TT";
// Fixture limits (inclusive unless otherwise noted)
const MIN_ST_HT_ANGLE = -10;
const MAX_ST_HT_ANGLE = 10;
const MIN_HTX = 80;
const MAX_HTX = 700;
const MIN_HTY = 0;
const MAX_HTY = 400; // (accounting for upper cone standoff as well)
const MIN_HT_LENGTH_LARGEST = 60; // minimum ht length for the largest reasonable ht diameter
const HT_CONE_RANGE = 20; // y difference from smallest to largest reasonable ht diameter
const MIN_DAX = 50;
const MAX_DAX = 600;
const MIN_DAY = 0;
const MAX_DAY = 250;
// Derived
const MAX_HTY_TOP_LARGEST = MAX_HTY + MIN_HT_LENGTH_LARGEST; // maximum htytop of the widest reasonable ht
const MAX_HTY_TOP_SMALLEST = MAX_HTY + MIN_HT_LENGTH_LARGEST - HT_CONE_RANGE; // maximum htytop of the narrowest reasonable ht

// helper for yup transform function
function emptyStringToNull(value, originalValue) {
  if (typeof originalValue === "string" && originalValue.trim() === "") {
    return null;
  }
  return value;
}

// additional method to ensure abs(bbdrop) is less than or equal to cslength
yup.addMethod(yup.number, "absMax", function (
  max,
  // eslint-disable-next-line no-template-curly-in-string
  message = "${path} must be less than or equal to the absolute value of ${max}"
) {
  return this.test({
    message,
    name: "max",
    exclusive: true,
    params: { max },
    test(value) {
      const other = this.resolve(max);
      return value == null || other == null || Math.abs(value) <= other;
    },
  });
});

const basicInputSchema = yup.object().shape({
  hta: yup
    .number()
    .moreThan(0)
    .lessThan(180)
    .transform(emptyStringToNull)
    .required(),
  sta: yup
    .number()
    .moreThan(0)
    .lessThan(180)
    .transform(emptyStringToNull)
    .nullable(),
  htlength: yup
    .number()
    .min(MIN_HT_LENGTH_LARGEST)
    .transform(emptyStringToNull)
    .nullable(),
  bbdrop: yup
    .number()
    .transform(emptyStringToNull)
    .nullable()
    .absMax(yup.ref("cslength"))
    .absMax(yup.ref("frontcenter")),
  cslength: yup.number().moreThan(0).transform(emptyStringToNull).nullable(),
  stack: yup.number().moreThan(0).transform(emptyStringToNull).nullable(),
  reach: yup.number().moreThan(0).transform(emptyStringToNull).nullable(),
  frontcenter: yup.number().moreThan(0).transform(emptyStringToNull).nullable(),
  etttaiwanese: yup
    .number()
    .moreThan(0)
    .transform(emptyStringToNull)
    .nullable(),
  etttt: yup.number().moreThan(0).transform(emptyStringToNull).nullable(),
  htttoffset: yup.number().moreThan(0).transform(emptyStringToNull).nullable(),
  forklength: yup.number().moreThan(0).transform(emptyStringToNull).nullable(),
  isac: yup.boolean().nullable(),
  forkoffset: yup
    .number()
    .transform(emptyStringToNull)
    .nullable()
    .when("isac", (isac, schema) =>
      isac ? schema.absMax(yup.ref("forklength")) : schema
    ),
  lhsh: yup.number().min(0).transform(emptyStringToNull).nullable(),
});

function toTitleCase(str) {
  const lowers = [
    "A",
    "An",
    "The",
    "And",
    "But",
    "Or",
    "For",
    "Nor",
    "As",
    "At",
    "By",
    "For",
    "From",
    "In",
    "Into",
    "Near",
    "Of",
    "On",
    "Onto",
    "To",
    "With",
  ];

  const uppers = ["Ht", "Tt", "St", "Ett", "Bb", "Cs"];

  return uppers.reduce(
    (s, upper) =>
      s.replace(new RegExp("\\b" + upper + "\\b", "g"), upper.toUpperCase()),
    lowers.reduce(
      (s, lower) =>
        s.replace(new RegExp("\\s" + lower + "\\s", "g"), function (txt) {
          return txt.toLowerCase();
        }),
      str.replace(/([^\W_]+[^\s-]*) */g, function (txt) {
        return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
      })
    )
  );
}

function degToRad(degrees) {
  return degrees * (Math.PI / 180);
}

function htaStackReachToHtx(hta, stack, reach) {
  return (
    Math.sqrt(Math.pow(stack, 2) + Math.pow(reach, 2)) *
    Math.sin(degToRad(180 - hta) - Math.atan(stack / reach))
  );
}

function htaHtlStackReachToHty(hta, htlength, stack, reach) {
  return (
    Math.sqrt(Math.pow(stack, 2) + Math.pow(reach, 2)) *
      Math.cos(degToRad(180 - hta) - Math.atan(stack / reach)) -
    htlength
  );
}

function correctForkLength(forklength, forkoffset, isac) {
  // if isac (is axle-to-crown), find true fork length along steering axis
  return isac
    ? Math.sqrt(Math.pow(forklength, 2) - Math.pow(forkoffset, 2))
    : forklength;
}

const labels = {
  hta: "HT angle",
  sta: "ST angle",
  htlength: "HT length",
  cslength: "CS length",
  bbdrop: "BB drop",
  stack: "stack",
  reach: "reach",
  frontcenter: "front center",
  etttaiwanese: "ETT Taiwanese (at HT top)",
  etttt: "ETT (at HT-TT junction)",
  htttoffset: "offset from HT top to TT centerline",
  forklength: "fork length",
  forkoffset: "fork offset",
  lhsh: "lower headset stack height",
};

function InputField({ errors, register, name, errorMessage }) {
  const errorMaybe = errors[name];

  return (
    <p className="param">
      <label
        htmlFor={name}
        className={classNames({ "text-error": errorMaybe })}
      >
        {toTitleCase(labels[name])}
      </label>
      <input
        type="text"
        name={name}
        id={name}
        ref={register}
        className={classNames({ error: errorMaybe })}
      />
      {errorMaybe && (
        <span className="text-error">{errorMessage || errorMaybe.message}</span>
      )}
    </p>
  );
}

function round2(num) {
  return +(Math.round(num + "e+2") + "e-2");
}

function Result({ label, errors, values, calculate, validate }) {
  const waitingOn = Object.keys(values)
    .filter((k) => k !== "isac")
    .reduce((acc, key) => {
      const value = values[key];
      if (
        typeof value === "undefined" ||
        value === null ||
        value === "" ||
        errors[key]
      ) {
        return [...acc, key];
      }
      return acc;
    }, []);

  return (
    <p>
      <strong>{label}</strong>{" "}
      {waitingOn.length ? (
        <span className="text-grey">
          Waiting on {waitingOn.map((k) => labels[k]).join(", ")}
        </span>
      ) : (
        (() => {
          const result = round2(calculate(values));
          const bad = validate(result);
          return (
            <>
              {result}&nbsp;
              {bad ? (
                <span className="text-error">
                  ✗ {bad !== true ? bad : "Out of range"}
                </span>
              ) : (
                <span className="text-success">✓ Ok</span>
              )}
            </>
          );
        })()
      )}
    </p>
  );
}

function getFrameExampleVariables(i) {
  const [
    // eslint-disable-next-line no-unused-vars
    _name,
    hta,
    sta,
    htlength,
    stack,
    reach,
    cslength,
    bbdrop,
  ] = frameExamples[i];
  return { hta, sta, htlength, stack, reach, cslength, bbdrop };
}

function SelectExample({ onSelect }) {
  return (
    <p>
      <label htmlFor="frame-example">Examples</label>
      <select
        id="frame-example"
        value=""
        onChange={(e) => onSelect(getFrameExampleVariables(e.target.value))}
      >
        <option value="">---</option>
        {frameExamples.map(([name], i) => (
          <option key={i} value={i}>
            {name}
          </option>
        ))}
      </select>
    </p>
  );
}

function FieldCol({ pdm, forPdm = null, notForPdm = null, children }) {
  return (
    <div
      className={classNames("col-4", {
        "is-hidden":
          (forPdm && pdm !== forPdm) || (notForPdm && pdm === notForPdm),
      })}
    >
      {children}
    </div>
  );
}

function Calculator() {
  const [pdm, setPdm] = useState(PDM_STACK_REACH);

  const { register, watch, errors, trigger, setValue } = useForm({
    mode: "all",
    resolver: yupResolver(basicInputSchema),
  });

  // Trigger bbdrop validation when cslength or frontcenter (dependencies) change
  const cslength = watch("cslength");
  const frontcenter = watch("frontcenter");
  useEffect(() => {
    trigger("bbdrop");
  }, [trigger, cslength, frontcenter]);

  // Do the same for forkoffset when forklength or isac change
  const isac = watch("isac");
  const forklength = watch("forklength");
  useEffect(() => {
    trigger("forkoffset");
  }, [trigger, isac, forklength]);

  const htlength = watch("htlength");

  const valuesMap = (...fields) =>
    fields
      .filter((x) => x)
      .reduce((acc, field) => {
        const v = watch(field);
        return { ...acc, [field]: v && field !== "isac" ? parseFloat(v) : v };
      }, {});

  function setPdmAndClearFields(value) {
    const forkAndHeadsetFields = ["forklength", "isac", "forkoffset", "lhsh"];
    const pdmDepFields = {
      [PDM_STACK_REACH]: ["stack", "reach"],
      [PDM_FRONT_CENTER]: ["frontcenter", ...forkAndHeadsetFields],
      [PDM_ETT_TAIWANESE]: ["etttaiwanese", ...forkAndHeadsetFields],
      [PDM_ETT_TT]: ["etttt", "htttoffset", ...forkAndHeadsetFields],
    };
    const newFields = pdmDepFields[value];

    // Update pdm
    setPdm(value);
    // Clear all primary-dimension fields that aren't used in the new mode
    [
      "stack",
      "reach",
      "frontcenter",
      "etttaiwanese",
      "etttt",
      "htttoffset",
      "forklength",
      "isac",
      "forkoffset",
      "lhsh",
    ].forEach((field) => {
      if (!newFields.includes(field)) {
        setValue(field, field === "isac" ? false : "");
      }
    });
  }

  return (
    <form>
      <h2>Frame Geometry</h2>
      <SelectExample
        onSelect={(fex) => {
          setPdmAndClearFields(PDM_STACK_REACH);
          Object.keys(fex).forEach((k) => setValue(k, fex[k]));
        }}
      />
      <div className="row">
        <FieldCol>
          <InputField
            name="hta"
            errorMessage="Must be a reasonable number in degrees"
            errors={errors}
            register={register}
          />
        </FieldCol>
        <FieldCol>
          <InputField
            name="sta"
            errorMessage="Must be a reasonable number in degrees"
            errors={errors}
            register={register}
          />
          <p className="small">Angle of tube above bend (if any)</p>
        </FieldCol>
        <FieldCol>
          <InputField
            name="htlength"
            errorMessage={`Must be a positive number greater than or equal to ${MIN_HT_LENGTH_LARGEST}`}
            errors={errors}
            register={register}
          />
        </FieldCol>
      </div>
      <div className="row">
        <FieldCol>
          <p>
            <label htmlFor="pdm">Primary Dimensions Mode</label>
            <select
              id="pdm"
              name="pdm"
              value={pdm}
              onChange={(e) => setPdmAndClearFields(e.target.value)}
            >
              <option value={PDM_STACK_REACH}>Stack, reach</option>
              <option value={PDM_FRONT_CENTER}>
                Front center, fork, headset
              </option>
              <option value={PDM_ETT_TAIWANESE}>
                ETT Taiwanese (at top of HT), fork, headset
              </option>
              <option value={PDM_ETT_TT}>
                ETT (at HT-TT junction), HT-TT offset, fork, headset
              </option>
            </select>
          </p>
        </FieldCol>
        <FieldCol pdm={pdm} forPdm={PDM_STACK_REACH}>
          <InputField
            name="stack"
            errorMessage="Must be a positive number"
            errors={errors}
            register={register}
          />
        </FieldCol>
        <FieldCol pdm={pdm} forPdm={PDM_STACK_REACH}>
          <InputField
            name="reach"
            errorMessage="Must be a positive number"
            errors={errors}
            register={register}
          />
        </FieldCol>
        <FieldCol pdm={pdm} forPdm={PDM_FRONT_CENTER}>
          <InputField
            name="frontcenter"
            errorMessage="Must be a positive number"
            errors={errors}
            register={register}
          />
        </FieldCol>
        <FieldCol pdm={pdm} forPdm={PDM_ETT_TAIWANESE}>
          <InputField
            name="etttaiwanese"
            errorMessage="Must be a positive number"
            errors={errors}
            register={register}
          />
        </FieldCol>
        <FieldCol pdm={pdm} forPdm={PDM_ETT_TT}>
          <InputField
            name="etttt"
            errorMessage="Must be a positive number"
            errors={errors}
            register={register}
          />
        </FieldCol>
        <FieldCol pdm={pdm} forPdm={PDM_ETT_TT}>
          <InputField
            name="htttoffset"
            errorMessage="Must be a positive number"
            errors={errors}
            register={register}
          />
        </FieldCol>
        <FieldCol pdm={pdm} notForPdm={PDM_STACK_REACH}>
          <InputField
            name="forklength"
            errorMessage="Must be a positive number"
            errors={errors}
            register={register}
          />
          <label className="small">
            <input type="checkbox" name="isac" ref={register} /> Axle-to-crown
            (direct)?
          </label>
        </FieldCol>
        <FieldCol pdm={pdm} notForPdm={PDM_STACK_REACH}>
          <InputField
            name="forkoffset"
            errorMessage={`Must be a number${
              isac
                ? " that is less than or equal to fork length (when measured axle-to-crown)"
                : ""
            } in magnitude`}
            errors={errors}
            register={register}
          />
        </FieldCol>
        <FieldCol pdm={pdm} notForPdm={PDM_STACK_REACH}>
          <InputField
            name="lhsh"
            errorMessage="Must be a positive number or zero"
            errors={errors}
            register={register}
          />
        </FieldCol>
      </div>
      <div className="row">
        <FieldCol>
          <InputField
            name="cslength"
            errorMessage="Must be a positive number"
            errors={errors}
            register={register}
          />
        </FieldCol>
        <FieldCol>
          <InputField
            name="bbdrop"
            errorMessage={`Must be a number that is less than or equal to CS length${
              pdm === PDM_FRONT_CENTER ? " and front center" : ""
            } in magnitude`}
            errors={errors}
            register={register}
          />
        </FieldCol>
      </div>
      <h2>Fixture Setup</h2>
      <Result
        label="ST-HT angle"
        errors={errors}
        values={valuesMap("hta", "sta")}
        calculate={({ hta, sta }) => sta - hta}
        validate={(v) =>
          v < MIN_ST_HT_ANGLE ? true : v > MAX_ST_HT_ANGLE ? true : false
        }
      />
      <Result
        label={
          <>
            HT<sub>X</sub>
          </>
        }
        errors={errors}
        values={
          pdm === PDM_STACK_REACH
            ? valuesMap("hta", "stack", "reach")
            : pdm === PDM_FRONT_CENTER
            ? valuesMap("hta", "frontcenter", "forkoffset", "bbdrop")
            : pdm === PDM_ETT_TAIWANESE
            ? valuesMap(
                "hta",
                "sta",
                "htlength",
                "etttaiwanese",
                "forklength",
                "isac",
                "forkoffset",
                "lhsh",
                "bbdrop"
              )
            : pdm === PDM_ETT_TT
            ? valuesMap(
                "hta",
                "sta",
                "htlength",
                "etttt",
                "htttoffset",
                "forklength",
                "isac",
                "forkoffset",
                "lhsh",
                "bbdrop"
              )
            : {}
        }
        calculate={(values) => {
          const { hta } = values;

          if (pdm === PDM_STACK_REACH) {
            const { stack, reach } = values;
            return htaStackReachToHtx(hta, stack, reach);
          } else if (pdm === PDM_FRONT_CENTER) {
            const { frontcenter, bbdrop, forkoffset } = values;
            return (
              Math.sin(degToRad(hta)) *
                Math.sqrt(Math.pow(frontcenter, 2) - Math.pow(bbdrop, 2)) +
              bbdrop * Math.cos(degToRad(hta)) -
              forkoffset
            );
          } else if (pdm === PDM_ETT_TAIWANESE) {
            const {
              sta,
              htlength,
              etttaiwanese,
              forklength,
              isac,
              forkoffset,
              lhsh,
              bbdrop,
            } = values;
            const h = degToRad(hta);
            const stack =
              (htlength +
                correctForkLength(forklength, forkoffset, isac) +
                lhsh) *
                Math.sin(h) -
              forkoffset * Math.cos(h) +
              bbdrop;
            const reach = etttaiwanese - stack * Math.tan(degToRad(90 - sta));
            return htaStackReachToHtx(hta, stack, reach);
          } else if (pdm === PDM_ETT_TT) {
            const {
              sta,
              htlength,
              etttt,
              htttoffset,
              forklength,
              isac,
              forkoffset,
              lhsh,
              bbdrop,
            } = values;
            const h = degToRad(hta);
            const stackToHtTt =
              (htlength -
                htttoffset +
                correctForkLength(forklength, forkoffset, isac) +
                lhsh) *
                Math.sin(h) -
              forkoffset * Math.cos(h) +
              bbdrop;
            const reachToHtTt =
              etttt - stackToHtTt * Math.tan(degToRad(90 - sta));
            return htaStackReachToHtx(hta, stackToHtTt, reachToHtTt);
          }
        }}
        validate={(v) => v < MIN_HTX || v > MAX_HTX}
      />
      <Result
        label={
          <>
            HT<sub>Y</sub>
          </>
        }
        errors={errors}
        values={
          pdm === PDM_STACK_REACH
            ? valuesMap("hta", "htlength", "stack", "reach")
            : pdm === PDM_FRONT_CENTER
            ? valuesMap(
                "hta",
                "frontcenter",
                "forklength",
                "isac",
                isac ? "forkoffset" : null,
                "lhsh",
                "bbdrop"
              )
            : pdm === PDM_ETT_TAIWANESE
            ? valuesMap(
                "hta",
                "sta",
                "htlength",
                "etttaiwanese",
                "forklength",
                "isac",
                "forkoffset",
                "lhsh",
                "bbdrop"
              )
            : pdm === PDM_ETT_TT
            ? valuesMap(
                "hta",
                "sta",
                "htlength",
                "etttt",
                "htttoffset",
                "forklength",
                "isac",
                "forkoffset",
                "lhsh",
                "bbdrop"
              )
            : {}
        }
        calculate={(values) => {
          const { hta } = values;

          if (pdm === PDM_STACK_REACH) {
            const { htlength, stack, reach } = values;
            return htaHtlStackReachToHty(hta, htlength, stack, reach);
          } else if (pdm === PDM_FRONT_CENTER) {
            const {
              frontcenter,
              forklength,
              isac,
              forkoffset = undefined,
              lhsh,
              bbdrop,
            } = values;
            const h = degToRad(hta);
            return (
              correctForkLength(forklength, forkoffset, isac) +
              lhsh -
              (Math.sqrt(Math.pow(frontcenter, 2) - Math.pow(bbdrop, 2)) *
                Math.cos(h) -
                bbdrop * Math.sin(h))
            );
          } else if (pdm === PDM_ETT_TAIWANESE) {
            const {
              sta,
              htlength,
              etttaiwanese,
              forklength,
              isac,
              forkoffset,
              lhsh,
              bbdrop,
            } = values;
            const h = degToRad(hta);
            const stack =
              (htlength +
                correctForkLength(forklength, forkoffset, isac) +
                lhsh) *
                Math.sin(h) -
              forkoffset * Math.cos(h) +
              bbdrop;
            const reach = etttaiwanese - stack * Math.tan(degToRad(90 - sta));
            return htaHtlStackReachToHty(hta, htlength, stack, reach);
          } else if (pdm === PDM_ETT_TT) {
            const {
              sta,
              htlength,
              etttt,
              htttoffset,
              forklength,
              isac,
              forkoffset,
              lhsh,
              bbdrop,
            } = values;
            const h = degToRad(hta);
            const stackToHtTt =
              (htlength -
                htttoffset +
                correctForkLength(forklength, forkoffset, isac) +
                lhsh) *
                Math.sin(h) -
              forkoffset * Math.cos(h) +
              bbdrop;
            const reachToHtTt =
              etttt - stackToHtTt * Math.tan(degToRad(90 - sta));
            return (
              htaHtlStackReachToHty(hta, htlength, stackToHtTt, reachToHtTt) +
              htttoffset
            );
          }
        }}
        validate={(v) => {
          if (v < MIN_HTY || v > MAX_HTY) {
            return true;
          }
          const htytop = v + parseFloat(htlength);
          if (htytop > MAX_HTY_TOP_SMALLEST) {
            const impossible = htytop > MAX_HTY_TOP_LARGEST;
            return (
              <>
                HT<sub>Y</sub> (bottom) is within range, but{" "}
                {impossible
                  ? "the top of the head tube will exceed the upper limit"
                  : "the top of the head tube could possibly exceed the upper limit, depending on its diameter"}
              </>
            );
          }
        }}
      />
      <Result
        label={
          <>
            DA<sub>X</sub>
          </>
        }
        errors={errors}
        values={valuesMap("hta", "cslength", "bbdrop")}
        calculate={({ hta, cslength, bbdrop }) =>
          cslength *
          Math.cos(degToRad(90) - degToRad(hta) + Math.asin(bbdrop / cslength))
        }
        validate={(v) => v < MIN_DAX || v > MAX_DAX}
      />
      <Result
        label={
          <>
            DA<sub>Y</sub>
          </>
        }
        errors={errors}
        values={valuesMap("hta", "cslength", "bbdrop")}
        calculate={({ hta, cslength, bbdrop }) =>
          cslength *
          Math.sin(degToRad(90) - degToRad(hta) + Math.asin(bbdrop / cslength))
        }
        validate={(v) => v < MIN_DAY || v > MAX_DAY}
      />
    </form>
  );
}

export default Calculator;
