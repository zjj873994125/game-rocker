<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import { useAuthStore } from '../stores/auth'

type LoginForm = {
  phone: string
  password: string
}

type RegisterForm = LoginForm & {
  nickname: string
  confirmPassword: string
}

const auth = useAuthStore()
const router = useRouter()
const loginFormRef = ref<FormInstance>()
const registerFormRef = ref<FormInstance>()
const submitting = ref(false)

const loginForm = reactive<LoginForm>({
  phone: '',
  password: '',
})

const registerForm = reactive<RegisterForm>({
  phone: '',
  nickname: '',
  password: '',
  confirmPassword: '',
})

const dialogTitle = computed(() => auth.authMode === 'login' ? '登录账号' : '注册账号')

const phoneRules = [
  { required: true, message: '请输入手机号', trigger: 'blur' },
  { pattern: /^1[3-9]\d{9}$/, message: '请输入 11 位中国大陆手机号', trigger: 'blur' },
]

const loginRules: FormRules<LoginForm> = {
  phone: phoneRules,
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码至少 6 位', trigger: 'blur' },
  ],
}

const registerRules: FormRules<RegisterForm> = {
  phone: phoneRules,
  nickname: [
    { required: true, message: '请输入昵称', trigger: 'blur' },
    { min: 2, max: 16, message: '昵称长度为 2 到 16 位', trigger: 'blur' },
  ],
  password: loginRules.password,
  confirmPassword: [
    { required: true, message: '请再次输入密码', trigger: 'blur' },
    {
      validator: (_rule, value, callback) => {
        if (value !== registerForm.password) {
          callback(new Error('两次输入的密码不一致'))
          return
        }

        callback()
      },
      trigger: 'blur',
    },
  ],
}

watch(
  () => auth.authDialogVisible,
  (visible) => {
    if (!visible) return

    loginFormRef.value?.clearValidate()
    registerFormRef.value?.clearValidate()
  },
)

function switchMode(mode: 'login' | 'register') {
  auth.authMode = mode
}

async function submitLogin() {
  if (!loginFormRef.value) return

  await loginFormRef.value.validate()
  submitting.value = true

  try {
    await auth.login(loginForm.phone.trim(), loginForm.password)
    ElMessage.success('登录成功')
    await afterAuthSuccess()
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '登录失败')
  } finally {
    submitting.value = false
  }
}

async function submitRegister() {
  if (!registerFormRef.value) return

  await registerFormRef.value.validate()
  submitting.value = true

  try {
    await auth.register(registerForm.phone.trim(), registerForm.password, registerForm.nickname)
    ElMessage.success('注册成功，已自动登录')
    await afterAuthSuccess()
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '注册失败')
  } finally {
    submitting.value = false
  }
}

async function afterAuthSuccess() {
  const redirectTo = auth.redirectAfterLogin
  auth.closeAuthDialog()

  if (redirectTo) {
    await router.push(redirectTo)
  }
}
</script>

<template>
  <el-dialog
    v-model="auth.authDialogVisible"
    :title="dialogTitle"
    width="430px"
    align-center
    class="auth-dialog"
  >
    <el-form
      v-if="auth.authMode === 'login'"
      ref="loginFormRef"
      :model="loginForm"
      :rules="loginRules"
      label-position="top"
      class="auth-form"
      @submit.prevent="submitLogin"
    >
      <el-form-item label="手机号" prop="phone">
        <el-input v-model="loginForm.phone" placeholder="请输入手机号" autocomplete="tel" />
      </el-form-item>
      <el-form-item label="密码" prop="password">
        <el-input v-model="loginForm.password" type="password" placeholder="请输入密码" show-password autocomplete="current-password" />
      </el-form-item>
      <button type="submit" class="auth-dialog__submit" :disabled="submitting">
        {{ submitting ? '登录中...' : '登录' }}
      </button>
      <p class="auth-dialog__link-line">
        还没有账号？
        <button type="button" @click="switchMode('register')">点击注册账号</button>
      </p>
    </el-form>

    <el-form
      v-else
      ref="registerFormRef"
      :model="registerForm"
      :rules="registerRules"
      label-position="top"
      class="auth-form"
      @submit.prevent="submitRegister"
    >
      <el-form-item label="手机号" prop="phone">
        <el-input v-model="registerForm.phone" placeholder="手机号将作为唯一账号" autocomplete="tel" />
      </el-form-item>
      <el-form-item label="昵称" prop="nickname">
        <el-input v-model="registerForm.nickname" placeholder="请输入玩家昵称" autocomplete="nickname" />
      </el-form-item>
      <el-form-item label="密码" prop="password">
        <el-input v-model="registerForm.password" type="password" placeholder="至少 6 位" show-password autocomplete="new-password" />
      </el-form-item>
      <el-form-item label="确认密码" prop="confirmPassword">
        <el-input
          v-model="registerForm.confirmPassword"
          type="password"
          placeholder="请再次输入密码"
          show-password
          autocomplete="new-password"
        />
      </el-form-item>
      <button type="submit" class="auth-dialog__submit" :disabled="submitting">
        {{ submitting ? '注册中...' : '注册并登录' }}
      </button>
      <p class="auth-dialog__link-line">
        已有账号？
        <button type="button" @click="switchMode('login')">返回登录</button>
      </p>
    </el-form>

    <p class="auth-dialog__tip">游客可以直接玩游戏；进入地图编辑器需要登录。</p>
  </el-dialog>
</template>
