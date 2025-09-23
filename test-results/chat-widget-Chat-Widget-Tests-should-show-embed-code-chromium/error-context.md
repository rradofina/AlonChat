# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e3]:
    - generic [ref=e4]:
      - heading "Sign in to AlonChat" [level=2] [ref=e5]
      - paragraph [ref=e6]: Build intelligent chatbots for your PH business
    - generic [ref=e7]:
      - generic [ref=e8]:
        - generic [ref=e9]:
          - generic [ref=e10]: Email address
          - textbox "Email address" [ref=e11]
        - generic [ref=e12]:
          - generic [ref=e13]: Password
          - textbox "Password" [ref=e14]
      - button "Sign in" [ref=e16] [cursor=pointer]
      - generic [ref=e21]: Or continue with
      - button "Google" [ref=e23] [cursor=pointer]:
        - img [ref=e24] [cursor=pointer]
        - text: Google
      - generic [ref=e30]:
        - text: Don't have an account?
        - link "Sign up" [ref=e31] [cursor=pointer]:
          - /url: /signup
  - region "Notifications alt+T"
```