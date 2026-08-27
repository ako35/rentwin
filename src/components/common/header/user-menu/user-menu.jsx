import { useDispatch, useSelector } from "react-redux"
import './user-menu.scss'
import { Button, Dropdown } from "react-bootstrap"
import { useNavigate } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { constants } from "../../../../constants"
import { Link } from "react-router-dom"
import { utils } from "../../../../utils"
import { logout } from "../../../../store"

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
              <Dropdown.Toggle>
                {user?.firstName || t('userMenu.guest')} {user?.lastName || ''}
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
            <Button className="text-info text-capitalize" onClick={() => navigate(login)}>
              {t('userMenu.login')}
            </Button>
            <Button className="text-info text-capitalize" onClick={() => navigate(register)}>
              {t('userMenu.register')}
            </Button>
          </>
        )
      }
    </div>
  )
}

export default UserMenu