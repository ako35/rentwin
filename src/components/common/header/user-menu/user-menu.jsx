import { useDispatch, useSelector } from "react-redux"
import './user-menu.scss'
import { Button, Dropdown } from "react-bootstrap"
import { BsChevronDown } from "react-icons/bs"
import { useNavigate } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { constants } from "../../../../constants"
import { Link } from "react-router-dom"
import { utils } from "../../../../utils"
import { logout } from "../../../../store"
import InitialsAvatar from "../../initials-avatar/initials-avatar"

const {
  routes: {
    login, register, userProfile, userReservations, adminDashboard
  },
} = constants

const UserMenu = () => {
  const { isLoggedIn, user } = useSelector(state => state.auth)
  const navigate = useNavigate()
  const dispatach = useDispatch()
  const { t } = useTranslation("common")

  const handleLogout = () => {
    utils.functions
      .swalQuestion(t('userMenu.logoutConfirmTitle'), t('userMenu.logoutConfirmText'))
      .then(response => {
        if (response.isConfirmed) {
          dispatach(logout())
        }
      })
  }
  return (
    <div className="user-menu">
      {
        isLoggedIn
        ? (
          <Dropdown align="end">
              <Dropdown.Toggle variant="light" className="user-menu__account">
                <InitialsAvatar
                  name={`${user?.firstName || t('userMenu.guest')} ${user?.lastName || ''}`}
                  size={22}
                />
                <span className="user-menu__account-name">
                  {user?.firstName || t('userMenu.guest')} {user?.lastName || ''}
                </span>
                <BsChevronDown className="user-menu__account-caret" aria-hidden="true" />
              </Dropdown.Toggle>
              <Dropdown.Menu>
                {
                  user?.roles?.includes('Administrator') && (
                    <>
                      <Dropdown.Item as={Link} to={adminDashboard}>
                        {t('userMenu.adminPanel')}
                      </Dropdown.Item>
                      <Dropdown.Divider />
                    </>
                  )
                }
                <Dropdown.Item as={Link} to={userProfile}>{t('userMenu.profile')}</Dropdown.Item>
                <Dropdown.Item as={Link} to={userReservations}>{t('userMenu.reservations')}</Dropdown.Item>
                <Dropdown.Item as={Link} onClick={handleLogout}>{t('userMenu.logout')}</Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown>
        )
        : (
          <>
            <Button variant="link" className="user-menu__login" onClick={() => navigate(login)}>
              {t('userMenu.login')}
            </Button>
            <Button className="user-menu__cta" onClick={() => navigate(register)}>
              {t('userMenu.register')}
            </Button>
          </>
        )
      }
    </div>
  )
}

export default UserMenu