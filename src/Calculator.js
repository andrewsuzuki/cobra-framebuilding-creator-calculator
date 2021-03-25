import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import classNames from "classnames";
import { useEffect } from "react";

// Constants
// Limits are inclusive unless noted.
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
  bbdrop: yup
    .number()
    .transform(emptyStringToNull)
    .nullable()
    .absMax(yup.ref("cslength")),
  cslength: yup.number().moreThan(0).transform(emptyStringToNull).nullable(),
  stack: yup.number().moreThan(0).transform(emptyStringToNull).nullable(),
  reach: yup.number().moreThan(0).transform(emptyStringToNull).nullable(),
  htlength: yup
    .number()
    .min(MIN_HT_LENGTH_LARGEST)
    .transform(emptyStringToNull)
    .nullable(),
});

const labels = {
  hta: "HT angle",
  sta: "ST angle",
  cslength: "CS length",
  bbdrop: "BB drop",
  stack: "stack",
  reach: "reach",
  htlength: "HT length",
};

function InputField({ errors, register, name, errorMessage }) {
  const errorMaybe = errors[name];

  return (
    <p>
      <label
        htmlFor={name}
        className={classNames("text-capitalize", { "text-error": errorMaybe })}
      >
        {labels[name]}
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
  const waitingOn = Object.keys(values).reduce((acc, key) => {
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

function degToRad(degrees) {
  return degrees * (Math.PI / 180);
}

function Calculator() {
  const { register, watch, errors, trigger } = useForm({
    mode: "all",
    resolver: yupResolver(basicInputSchema),
  });

  // Trigger bbdrop validation when cslength (dependency) changes
  const cslength = watch("cslength");
  useEffect(() => {
    trigger("bbdrop");
  }, [trigger, cslength]);

  const htlength = watch("htlength");

  const valuesMap = (...fields) =>
    fields.reduce((acc, field) => ({ [field]: watch(field), ...acc }), {});

  return (
    <form>
      <h2>Basic Inputs</h2>
      <div className="row">
        <div className="col-6">
          <InputField
            name="hta"
            errorMessage="Must be a reasonable number in degrees"
            errors={errors}
            register={register}
          />
        </div>
        <div className="col-6">
          <InputField
            name="sta"
            errorMessage="Must be a reasonable number in degrees"
            errors={errors}
            register={register}
          />
        </div>
      </div>
      <div className="row">
        <div className="col-6">
          <InputField
            name="stack"
            errorMessage="Must be a positive number"
            errors={errors}
            register={register}
          />
        </div>
        <div className="col-6">
          <InputField
            name="reach"
            errorMessage="Must be a positive number"
            errors={errors}
            register={register}
          />
        </div>
      </div>
      <div className="row">
        <div className="col-6">
          <InputField
            name="cslength"
            errorMessage="Must be a positive number"
            errors={errors}
            register={register}
          />
        </div>
        <div className="col-6">
          <InputField
            name="bbdrop"
            errorMessage="Must be a number that is less than or equal to CS length in magnitude"
            errors={errors}
            register={register}
          />
        </div>
      </div>
      <div className="row">
        <div className="col-6">
          <InputField
            name="htlength"
            errorMessage={`Must be a positive number greater than or equal to ${MIN_HT_LENGTH_LARGEST}`}
            errors={errors}
            register={register}
          />
        </div>
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
        values={valuesMap("hta", "stack", "reach")}
        calculate={({ hta, stack, reach }) =>
          Math.sqrt(Math.pow(stack, 2) + Math.pow(reach, 2)) *
          Math.sin(degToRad(180) - degToRad(hta) - Math.atan(stack / reach))
        }
        validate={(v) => v < MIN_HTX || v > MAX_HTX}
      />
      <Result
        label={
          <>
            HT<sub>Y</sub>
          </>
        }
        errors={errors}
        values={valuesMap("hta", "stack", "reach", "htlength")}
        calculate={({ hta, stack, reach, htlength }) =>
          Math.sqrt(Math.pow(stack, 2) + Math.pow(reach, 2)) *
            Math.cos(degToRad(180) - degToRad(hta) - Math.atan(stack / reach)) -
          htlength
        }
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
