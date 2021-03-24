import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import classNames from "classnames";

/**
 * Input (required): hta
 * Input (sta-hta): sta
 * Input (dax/day): bbdrop, cslength
 * Input (htx/hty/htytop): stack, reach, htlength
 *
 * Outputs/checks:
 * - htx
 * - hty
 * - htytop
 * - dax
 * - day
 * - sta-hta
 *
 * Output statuses:
 * - Ok (+value)
 * - Waiting
 * - Doesn't fit
 */

// helper for yup transform function
function emptyStringToNull(value, originalValue) {
  if (typeof originalValue === "string" && originalValue.trim() === "") {
    return null;
  }
  return value;
}

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
  bbdrop: yup.number().transform(emptyStringToNull).nullable(),
  cslength: yup.number().moreThan(0).transform(emptyStringToNull).nullable(),
  stack: yup.number().moreThan(0).transform(emptyStringToNull).nullable(),
  reach: yup.number().moreThan(0).transform(emptyStringToNull).nullable(),
  htlength: yup.number().moreThan(0).transform(emptyStringToNull).nullable(),
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

function Result({ label, errors, values, calculate }) {
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
      {label}:{" "}
      {waitingOn.length ? (
        <span className="text-grey">
          Waiting on {waitingOn.map((k) => labels[k]).join(", ")}
        </span>
      ) : (
        round2(calculate(values))
      )}
    </p>
  );
}

function degToRad(degrees) {
  return degrees * (Math.PI / 180);
}

function Calculator() {
  const { register, watch, errors } = useForm({
    mode: "onTouched",
    resolver: yupResolver(basicInputSchema),
  });

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
            errorMessage="Must be a number"
            errors={errors}
            register={register}
          />
        </div>
      </div>
      <div className="row">
        <div className="col-6">
          <InputField
            name="htlength"
            errorMessage="Must be a positive number"
            errors={errors}
            register={register}
          />
        </div>
      </div>
      <h2>Fixture Setup</h2>
      <Result
        label="ST-HT Angle"
        errors={errors}
        values={{ hta: watch("hta"), sta: watch("sta") }}
        calculate={({ hta, sta }) => sta - hta}
      />
      <Result
        label="HTX"
        errors={errors}
        values={{
          hta: watch("hta"),
          stack: watch("stack"),
          reach: watch("reach"),
        }}
        calculate={({ hta, stack, reach }) =>
          Math.sqrt(Math.pow(stack, 2), Math.pow(reach, 2)) *
          Math.sin(degToRad(180) - degToRad(hta) - Math.atan(stack / reach))
        }
      />
      <Result
        label="HTY"
        errors={errors}
        values={{
          hta: watch("hta"),
          stack: watch("stack"),
          reach: watch("reach"),
          htlength: watch("htlength"),
        }}
        calculate={({ hta, stack, reach, htlength }) =>
          Math.sqrt(Math.pow(stack, 2), Math.pow(reach, 2)) *
            Math.cos(degToRad(180) - degToRad(hta) - Math.atan(stack / reach)) -
          htlength
        }
      />
      <Result
        label="DAX"
        errors={errors}
        values={{
          hta: watch("hta"),
          cslength: watch("cslength"),
          bbdrop: watch("bbdrop"),
        }}
        calculate={({ hta, cslength, bbdrop }) =>
          cslength *
          Math.cos(degToRad(90) - degToRad(hta) - Math.asin(bbdrop / cslength))
        }
      />
      <Result
        label="DAY"
        errors={errors}
        values={{
          hta: watch("hta"),
          cslength: watch("cslength"),
          bbdrop: watch("bbdrop"),
        }}
        calculate={({ hta, cslength, bbdrop }) =>
          cslength *
          Math.sin(degToRad(90) - degToRad(hta) - Math.asin(bbdrop / cslength))
        }
      />
    </form>
  );
}

export default Calculator;
