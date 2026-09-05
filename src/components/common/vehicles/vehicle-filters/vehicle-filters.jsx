import { useTranslation } from "react-i18next";
import { BsXLg } from "react-icons/bs";
import "./vehicle-filters.scss";

const VehicleFilters = ({ options, active, onToggle, onClear, activeCount }) => {
  const { t } = useTranslation("vehicles");
  const { t: tCommon } = useTranslation("common");

  const groups = [
    {
      key: "transmission",
      title: t("filters.transmission"),
      items: options.transmission,
      labelFor: (value) => tCommon(`options.transmissionTypes.${value}`),
    },
    {
      key: "fuelType",
      title: t("filters.fuelType"),
      items: options.fuelType,
      labelFor: (value) => tCommon(`options.fuelTypes.${value}`),
    },
    {
      key: "brand",
      title: t("filters.brand"),
      items: options.brand,
      labelFor: (value) => value,
    },
  ].filter((group) => group.items.length > 0);

  return (
    <aside className="vehicle-filters">
      <div className="vehicle-filters__header">
        <h3>{t("filters.title")}</h3>
        {activeCount > 0 && (
          <button type="button" className="vehicle-filters__clear" onClick={onClear}>
            <BsXLg /> {t("filters.clear")}
          </button>
        )}
      </div>

      {groups.map((group) => (
        <details className="vehicle-filters__group" key={group.key} open>
          <summary>{group.title}</summary>
          <ul>
            {group.items.map(({ value, count }) => (
              <li key={value}>
                <label>
                  <input
                    type="checkbox"
                    checked={active[group.key].includes(value)}
                    onChange={() => onToggle(group.key, value)}
                  />
                  <span>{group.labelFor(value)}</span>
                  <small>{count}</small>
                </label>
              </li>
            ))}
          </ul>
        </details>
      ))}
    </aside>
  );
};

export default VehicleFilters;
