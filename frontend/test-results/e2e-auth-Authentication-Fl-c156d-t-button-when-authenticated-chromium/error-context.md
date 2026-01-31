# Page snapshot

```yaml
- generic [ref=e1]:
  - generic [ref=e3]:
    - generic [ref=e4]:
      - generic [ref=e5]: Login
      - generic [ref=e6]: Enter your credentials to access your account
    - generic [ref=e7]:
      - generic [ref=e8]:
        - generic [ref=e9]:
          - generic [ref=e10]: Email
          - textbox "Email" [ref=e11]:
            - /placeholder: m@example.com
            - text: gym_draft@example.com
        - generic [ref=e12]:
          - generic [ref=e13]: Password
          - textbox "Password" [ref=e14]:
            - /placeholder: ••••••
            - text: password123
        - button "Login" [active] [ref=e15]
      - generic [ref=e16]:
        - text: Don't have an account?
        - link "Sign up" [ref=e17] [cursor=pointer]:
          - /url: /auth/register
  - region "Notifications alt+T"
  - alert [ref=e18]
```